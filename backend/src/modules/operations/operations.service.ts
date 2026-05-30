import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as XLSX from "xlsx";
import { Repository } from "typeorm";
import { Event } from "./event.entity";
import { Referent } from "./referent.entity";

type PreviewRow = Record<string, string | number | null>;

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Referent)
    private readonly referentRepository: Repository<Referent>
  ) {}

  listEvents(campaignId?: string) {
    return this.eventRepository.find({
      where: campaignId ? { campaignId } : undefined,
      order: { fechaHora: "ASC" },
    });
  }

  async deleteEvent(id: string) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) throw new NotFoundException("Evento no encontrado");
    await this.eventRepository.delete({ id });
    return { ok: true };
  }

  listReferents(campaignId?: string) {
    return this.referentRepository.find({
      where: campaignId ? { campaignId } : undefined,
      order: { nombreApellido: "ASC" },
    });
  }

  async deleteReferent(id: string) {
    const ref = await this.referentRepository.findOneBy({ id });
    if (!ref) throw new NotFoundException("Referente no encontrado");
    await this.referentRepository.delete({ id });
    return { ok: true };
  }

  createEvent(dto: Partial<Event>) {
    const normalized = this.normalizeEventPayload(dto, false);
    return this.eventRepository.save(this.eventRepository.create(normalized));
  }

  async updateEvent(id: string, dto: Partial<Event>) {
    const current = await this.eventRepository.findOneBy({ id });
    if (!current) {
      throw new BadRequestException("Evento no encontrado");
    }
    const normalized = this.normalizeEventPayload({ ...current, ...dto }, true);
    Object.assign(current, normalized);
    return this.eventRepository.save(current);
  }

  createReferent(dto: Partial<Referent>) {
    return this.referentRepository.save(this.referentRepository.create(dto));
  }

  async updateReferent(id: string, dto: Partial<Referent>) {
    const current = await this.referentRepository.findOneBy({ id });
    if (!current) {
      throw new BadRequestException("Referente no encontrado");
    }
    Object.assign(current, dto);
    return this.referentRepository.save(current);
  }

  previewReuniones(file: { buffer: Buffer }) {
    const workbook = this.readWorkbook(file);
    const prensaRows = this.parseSheet(workbook, "R. PRENSA", 2);
    const barrialesRows = this.parseSheet(workbook, "R.BARRIALES", 2);
    return {
      hojasDetectadas: workbook.SheetNames,
      prensa: {
        cantidad: prensaRows.length,
        muestra: prensaRows.slice(0, 5)
      },
      barriales: {
        cantidad: barrialesRows.length,
        muestra: barrialesRows.slice(0, 5)
      }
    };
  }

  async commitReuniones(campaignId: string, file: { buffer: Buffer }) {
    if (!campaignId) {
      throw new BadRequestException("campaignId es obligatorio");
    }
    const workbook = this.readWorkbook(file);
    const prensaRows = this.parseSheet(workbook, "R. PRENSA", 2);
    const barrialesRows = this.parseSheet(workbook, "R.BARRIALES", 2);

    let creados = 0;
    for (const row of prensaRows) {
      if (!row.LUGAR_MEDIO_DE_PRENSA) continue;
      await this.eventRepository.save(
        this.eventRepository.create({
          campaignId,
          tipo: "Prensa",
          fechaHora: this.parseDateTime(row.FECHA_Y_HORA),
          lugar: this.toText(row.LUGAR_MEDIO_DE_PRENSA),
          direccion: this.toText(row.DIRECCION),
          programa: this.toText(row.PROGRAMA),
          contacto: this.toText(row.CONTACTO),
          observacion: this.toText(row.OBSERVACION)
        })
      );
      creados += 1;
    }

    for (const row of barrialesRows) {
      if (!row.NOMBRE_Y_APELLIDO_DUENOA_DE_LA_CASA) continue;
      await this.eventRepository.save(
        this.eventRepository.create({
          campaignId,
          tipo: "Barrial",
          fechaHora: this.parseDateWithHour(row.FECHA, row.HORA),
          anfitrion: this.toText(row.NOMBRE_Y_APELLIDO_DUENOA_DE_LA_CASA),
          celular: this.normalizePhone(row.CELULAR),
          direccion: this.toText(row.DIRECCION),
          barrio: this.toText(row.BARRIO),
          ubicacionUrl: this.toText(row.UBICACION),
          circuitoCodigo: this.toCircuit(row.CIRCUITO),
          referente: this.toText(row.REFERENTE),
          observacion: this.toText(row.OBSERVACION)
        })
      );
      creados += 1;
    }

    return { eventosCreados: creados };
  }

  previewReferentes(file: { buffer: Buffer }) {
    const workbook = this.readWorkbook(file);
    const rows = this.parseReferentesPlanilla(workbook);
    return {
      hojasDetectadas: workbook.SheetNames,
      referentes: {
        cantidad: rows.length,
        muestra: rows.slice(0, 5)
      }
    };
  }

  async commitReferentes(campaignId: string, file: { buffer: Buffer }) {
    if (!campaignId) {
      throw new BadRequestException("campaignId es obligatorio");
    }
    const workbook = this.readWorkbook(file);
    const rows = this.parseReferentesPlanilla(workbook);
    let creados = 0;
    let omitidos = 0;

    for (const row of rows) {
      const nombre = this.toText(row.nombre);
      if (!nombre) {
        omitidos += 1;
        continue;
      }
      if (this.isGarbageReferentRow(row)) {
        omitidos += 1;
        continue;
      }
      await this.referentRepository.save(
        this.referentRepository.create({
          campaignId,
          nombreApellido: nombre,
          celular: this.normalizePhone(row.telefono),
          direccion: this.toText(row.direccion),
          barrio: this.toText(row.barrio),
          chacra: this.toText(row.chacra),
          circuitoCodigo: this.toCircuit(row.circuito),
          ubicacionUrl: this.toText(row.ubicacionUrl),
          referenteDe: this.toText(row.dependencia),
          observacion: this.toText(row.observacion)
        })
      );
      creados += 1;
    }

    return { referentesCreados: creados, omitidos };
  }

  private parseReferentesPlanilla(workbook: XLSX.WorkBook) {
    const sheetName =
      workbook.SheetNames.find((n) => /hoja\s*1/i.test(n)) ?? workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [] as Array<Record<string, string | number | null>>;

    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
      header: 1,
      raw: false,
      blankrows: false
    });

    let headerIdx = matrix.findIndex((row) =>
      `${row?.[0] ?? ""}`.toUpperCase().includes("REFERENT")
    );
    if (headerIdx < 0) headerIdx = 1;

    const out: Array<Record<string, string | number | null>> = [];
    for (const row of matrix.slice(headerIdx + 1)) {
      const nombre = this.toText(row?.[0]);
      if (!nombre) continue;
      const coerce = (v: unknown): string | number | null => {
        if (v === null || v === undefined) return null;
        if (v instanceof Date) return v.toISOString();
        return v as string | number | null;
      };
      const telefono = coerce(row?.[1]);
      const direccion = coerce(row?.[2]);
      const barrio = coerce(row?.[3]);
      const chacra = coerce(row?.[4]);
      const circuito = coerce(row?.[5]);
      const dependencia = coerce(row?.[6]);
      const observacion = coerce(row?.[7]);

      out.push({
        nombre,
        telefono,
        direccion,
        barrio,
        chacra,
        circuito,
        dependencia,
        observacion,
        ubicacionUrl: null
      });
    }
    return out;
  }

  private isGarbageReferentRow(row: Record<string, string | number | null>) {
    const nombre = `${row.nombre ?? ""}`.trim();
    const telefono = `${row.telefono ?? ""}`.trim();
    if (!nombre) return true;
    if (telefono && nombre === telefono) return true;
    if (nombre.toUpperCase() === "REFERENTES") return true;
    const same = [row.barrio, row.circuito, row.dependencia]
      .filter(Boolean)
      .every((v) => `${v}`.trim() === nombre);
    return same;
  }

  private readWorkbook(file: { buffer: Buffer }) {
    if (!file?.buffer) {
      throw new BadRequestException("Archivo requerido");
    }
    return XLSX.read(file.buffer, { type: "buffer", cellDates: true });
  }

  private parseSheet(workbook: XLSX.WorkBook, sheetName: string, headerRowNumber: number): PreviewRow[] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
      header: 1,
      raw: false,
      blankrows: false
    });
    const header = (matrix[headerRowNumber - 1] ?? []).map((v) => `${v ?? ""}`.trim());
    const rows = matrix.slice(headerRowNumber);
    const out: PreviewRow[] = [];
    for (const r of rows) {
      const obj: PreviewRow = {};
      let hasValue = false;
      header.forEach((key, idx) => {
        const normalizedKey = this.normalizeHeader(key);
        if (!normalizedKey) return;
        const val = r[idx] ?? null;
        obj[normalizedKey] = typeof val === "string" ? val.trim() : (val as number | null);
        if (obj[normalizedKey] !== null && obj[normalizedKey] !== "") hasValue = true;
      });
      if (hasValue) out.push(obj);
    }
    return out;
  }

  private normalizeHeader(raw: string) {
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  private toText(value: unknown) {
    if (value === null || value === undefined) return null;
    const text = `${value}`.trim();
    return text ? text : null;
  }

  private normalizePhone(value: unknown) {
    const text = this.toText(value);
    if (!text) return null;
    const normalized = text.replace(/[^\d]/g, "");
    return normalized || null;
  }

  private toCircuit(value: unknown) {
    const text = this.toText(value);
    if (!text) return null;
    const upper = text.toUpperCase().trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(upper) || upper.includes(":")) return null;
    const direct = upper.match(/^(\d{1,2})([AB])?$/);
    if (direct) return `${direct[1]}${direct[2] ?? ""}`;
    const embedded = upper.match(/\b(\d{1,2})([AB])\b/);
    if (embedded) return `${embedded[1]}${embedded[2]}`;
    return null;
  }

  private parseDateTime(value: unknown) {
    const text = this.toText(value);
    if (!text) return null;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseDateWithHour(dateValue: unknown, timeValue: unknown) {
    const dateText = this.toText(dateValue);
    if (!dateText) return null;
    const timeText = this.toText(timeValue) ?? "00:00";
    const candidate = new Date(`${dateText} ${timeText}`);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  private normalizeEventPayload(dto: Partial<Event>, isUpdate: boolean) {
    const tipoRaw = `${dto.tipo ?? ""}`.trim().toLowerCase();
    let tipo: "Prensa" | "Barrial" | "Operativo";
    if (tipoRaw === "prensa") tipo = "Prensa";
    else if (tipoRaw === "barrial") tipo = "Barrial";
    else if (tipoRaw === "operativo") tipo = "Operativo";
    else tipo = "Barrial"; // fallback

    const circuitoCodigo = dto.circuitoCodigo ? `${dto.circuitoCodigo}`.toUpperCase().trim() : null;
    const referente = dto.referente ? `${dto.referente}`.trim() : null;
    const lugar = dto.lugar ? `${dto.lugar}`.trim() : null;

    if (!lugar) {
      throw new BadRequestException("Lugar es obligatorio");
    }

    if (!isUpdate && !dto.fechaHora) {
      throw new BadRequestException("Fecha y hora es obligatoria");
    }

    // Parse referentIds / attendeeIds — frontend sends arrays, column is simple-json text
    const referentIds = Array.isArray(dto.referentIds)
      ? dto.referentIds
      : dto.referentIds
        ? (dto.referentIds as unknown as string[])
        : null;

    const attendeeIds = Array.isArray(dto.attendeeIds)
      ? dto.attendeeIds
      : dto.attendeeIds
        ? (dto.attendeeIds as unknown as string[])
        : null;

    const payload: Partial<Event> = {
      ...dto,
      tipo,
      lugar,
      referente,
      circuitoCodigo,
      lat: dto.lat != null ? Number(dto.lat) : null,
      lng: dto.lng != null ? Number(dto.lng) : null,
      estadoSolicitud: dto.estadoSolicitud ? `${dto.estadoSolicitud}`.toLowerCase() : "pendiente",
      resolucionNota: dto.resolucionNota ? `${dto.resolucionNota}`.trim() : null,
      referentIds: referentIds,
      attendeeIds: attendeeIds,
    };

    if (payload.estadoSolicitud === "resuelto" && !dto.resueltoAt) {
      payload.resueltoAt = new Date();
    }
    if (payload.estadoSolicitud !== "resuelto") {
      payload.resueltoAt = null;
    }

    return payload;
  }
}
