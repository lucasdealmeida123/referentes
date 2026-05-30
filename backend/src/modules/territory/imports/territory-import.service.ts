import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { parseStringPromise } from "xml2js";
import JSZip from "jszip";
import { Repository } from "typeorm";
import { Circuit } from "../circuits/circuit.entity";
import { School } from "../schools/school.entity";
import { ElectionTable } from "../tables/election-table.entity";

type ParsedCircuit = {
  codigo: string;
  nombre: string;
  zona: string | null;
  electoresNacionales: number;
  electoresExtranjeros: number;
  cantidadEscuelas: number;
  cantidadMesas: number;
  polygonCoordinates: string | null;
};

type ParsedSchool = {
  nombre: string;
  circuitoCodigo: string | null;
  direccion: string | null;
  cantMesas: number | null;
  mesaDesde: number | null;
  mesaHasta: number | null;
  lat: number | null;
  lng: number | null;
};

type PreviewResult = {
  circuits: ParsedCircuit[];
  schools: ParsedSchool[];
  warnings: string[];
};

@Injectable()
export class TerritoryImportService {
  constructor(
    @InjectRepository(Circuit)
    private readonly circuitRepository: Repository<Circuit>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(ElectionTable)
    private readonly tableRepository: Repository<ElectionTable>
  ) {}

  async previewFromFile(file: { originalname: string; buffer: Buffer }) {
    if (!file?.buffer) {
      throw new BadRequestException("Archivo requerido");
    }

    const xml = await this.extractKmlXml(file);
    return this.parseKml(xml);
  }

  async commitFromFile(campaignId: string, file: { originalname: string; buffer: Buffer }) {
    if (!campaignId) {
      throw new BadRequestException("campaignId es obligatorio");
    }

    const preview = await this.previewFromFile(file);

    let circuitsCreated = 0;
    let circuitsUpdated = 0;
    let schoolsCreated = 0;
    let schoolsUpdated = 0;
    let tablesCreated = 0;

    const circuitByCode = new Map<string, Circuit>();
    for (const circuitData of preview.circuits) {
      const existing = await this.circuitRepository.findOne({
        where: { campaignId, codigo: circuitData.codigo }
      });

      if (existing) {
        existing.nombre = circuitData.nombre;
        existing.zona = circuitData.zona;
        existing.electoresNacionales = circuitData.electoresNacionales;
        existing.electoresExtranjeros = circuitData.electoresExtranjeros;
        existing.cantidadEscuelas = circuitData.cantidadEscuelas;
        existing.cantidadMesas = circuitData.cantidadMesas;
        existing.polygonCoordinates = circuitData.polygonCoordinates;
        await this.circuitRepository.save(existing);
        circuitByCode.set(circuitData.codigo, existing);
        circuitsUpdated += 1;
      } else {
        const created = await this.circuitRepository.save(
          this.circuitRepository.create({
            campaignId,
            codigo: circuitData.codigo,
            nombre: circuitData.nombre,
            zona: circuitData.zona,
            electoresNacionales: circuitData.electoresNacionales,
            electoresExtranjeros: circuitData.electoresExtranjeros,
            cantidadEscuelas: circuitData.cantidadEscuelas,
            cantidadMesas: circuitData.cantidadMesas,
            polygonCoordinates: circuitData.polygonCoordinates
          })
        );
        circuitByCode.set(circuitData.codigo, created);
        circuitsCreated += 1;
      }
    }

    for (const schoolData of preview.schools) {
      if (!schoolData.circuitoCodigo) {
        continue;
      }

      const circuit = circuitByCode.get(schoolData.circuitoCodigo);
      if (!circuit) {
        continue;
      }

      const existing = await this.schoolRepository.findOne({
        where: {
          campaignId,
          circuitId: circuit.id,
          nombre: schoolData.nombre
        }
      });

      let school: School;
      if (existing) {
        existing.direccion = schoolData.direccion;
        existing.lat = schoolData.lat;
        existing.lng = schoolData.lng;
        existing.cantMesasDeclaradas = schoolData.cantMesas ?? existing.cantMesasDeclaradas;
        school = await this.schoolRepository.save(existing);
        schoolsUpdated += 1;
      } else {
        school = await this.schoolRepository.save(
          this.schoolRepository.create({
            campaignId,
            circuitId: circuit.id,
            nombre: schoolData.nombre,
            direccion: schoolData.direccion,
            lat: schoolData.lat,
            lng: schoolData.lng,
            cantMesasDeclaradas: schoolData.cantMesas ?? 0
          })
        );
        schoolsCreated += 1;
      }

      if (schoolData.mesaDesde && schoolData.mesaHasta && schoolData.mesaHasta >= schoolData.mesaDesde) {
        for (let mesa = schoolData.mesaDesde; mesa <= schoolData.mesaHasta; mesa += 1) {
          const existsTable = await this.tableRepository.findOne({
            where: { campaignId, schoolId: school.id, numero: mesa }
          });
          if (!existsTable) {
            await this.tableRepository.save(
              this.tableRepository.create({
                campaignId,
                schoolId: school.id,
                numero: mesa,
                tipo: "nacional",
                estadoCobertura: "critico"
              })
            );
            tablesCreated += 1;
          }
        }
      }
    }

    return {
      summary: {
        circuitsCreated,
        circuitsUpdated,
        schoolsCreated,
        schoolsUpdated,
        tablesCreated
      },
      warnings: preview.warnings
    };
  }

  private async extractKmlXml(file: { originalname: string; buffer: Buffer }) {
    const isKmz = file.originalname.toLowerCase().endsWith(".kmz");
    if (!isKmz) {
      return file.buffer.toString("utf-8");
    }

    const zip = await JSZip.loadAsync(file.buffer);
    const kmlEntry = zip.file("doc.kml") ?? Object.values(zip.files).find((entry) => entry.name.endsWith(".kml"));
    if (!kmlEntry) {
      throw new BadRequestException("KMZ sin archivo KML interno");
    }
    return kmlEntry.async("string");
  }

  private async parseKml(xml: string): Promise<PreviewResult> {
    const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true, trim: true });
    const document = parsed?.kml?.Document;
    if (!document) {
      throw new BadRequestException("Formato KML invalido");
    }

    const folders = this.ensureArray(document.Folder);
    const circuits: ParsedCircuit[] = [];
    const schools: ParsedSchool[] = [];
    const warnings: string[] = [];

    for (const folder of folders) {
      const folderName = folder?.name ?? "";
      const placemarks = this.ensureArray(folder?.Placemark);

      for (const placemark of placemarks) {
        const name = this.cleanText(placemark?.name || "SIN_NOMBRE");
        const description = this.cleanText(placemark?.description || "");

        if (placemark?.Polygon) {
          const mapped = this.mapCircuit(name, description, placemark);
          circuits.push(mapped);
          continue;
        }

        if (placemark?.Point) {
          const mapped = this.mapSchool(name, description, folderName, placemark);
          schools.push(mapped);
        }
      }
    }

    if (circuits.length === 0) {
      warnings.push("No se detectaron circuitos (poligonos) en el archivo.");
    }
    if (schools.length === 0) {
      warnings.push("No se detectaron escuelas (puntos) en el archivo.");
    }

    return { circuits, schools, warnings };
  }

  private mapCircuit(name: string, description: string, placemark: any): ParsedCircuit {
    const values = this.parseDescriptionValues(description);
    const rawCode = this.pickCircuitCode(name, values.CIRCUITO ?? null);
    return {
      codigo: rawCode ?? name.replace("CIRCUITO", "").trim(),
      nombre: name,
      zona: values.ZONA ?? null,
      electoresNacionales: this.toInt(values["CANT. ELECTORES NAC"]) ?? 0,
      electoresExtranjeros: this.toInt(values.EXTRANJEROS) ?? 0,
      cantidadEscuelas: this.toInt(values["CANT ESC"]) ?? 0,
      cantidadMesas: this.toInt(values["CANT. MESAS"]) ?? 0,
      polygonCoordinates: this.normalizePolygonForStorage(
        placemark?.Polygon?.outerBoundaryIs?.LinearRing?.coordinates ?? null
      )
    };
  }

  /** Guarda polígonos como GeoJSON para no perder detalle al parsear en el mapa. */
  private normalizePolygonForStorage(raw: string | null) {
    if (!raw) return null;
    const trimmed = `${raw}`.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type === "Polygon" && Array.isArray(parsed.coordinates)) {
        return trimmed;
      }
    } catch {
      // KML: "lng,lat,alt lng,lat ..."
    }

    const points = trimmed
      .split(/\s+/)
      .map((chunk) => chunk.split(",").map((p) => Number(p.trim())))
      .filter((parts) => parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1]))
      .map((parts) => [parts[0], parts[1]] as [number, number]);

    if (points.length < 3) return null;

    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      points.push([first[0], first[1]]);
    }

    return JSON.stringify({
      type: "Polygon",
      coordinates: [points]
    });
  }

  private mapSchool(name: string, description: string, folderName: string, placemark: any): ParsedSchool {
    const values = this.parseDescriptionValues(description);
    const circuito =
      this.pickCircuitCode(values.CIRCUITO ?? values.Circuito ?? null, null) ||
      this.pickCircuitCode(folderName, null);
    const range = this.extractMesaRange(values["ORDEN MESAS"] ?? values["ORDEN DE MESA"] ?? null);
    const coordinates = `${placemark?.Point?.coordinates || ""}`.split(",");
    const lng = this.toFloat(coordinates[0]);
    const lat = this.toFloat(coordinates[1]);

    return {
      nombre: name,
      circuitoCodigo: circuito,
      direccion: values.DIRECCION ?? values["DIRECCIÓN"] ?? null,
      cantMesas: this.toInt(values["CANT.MESAS"] ?? values["CANT. MESAS"] ?? values["CANT MESAS"]),
      mesaDesde: range?.from ?? null,
      mesaHasta: range?.to ?? null,
      lat,
      lng
    };
  }

  private parseDescriptionValues(description: string) {
    const values: Record<string, string> = {};
    const lines = description
      .replace(/<br\s*\/?>/gi, "\n")
      .split("\n")
      .map((line) => line.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean);

    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) {
        continue;
      }
      const key = line.slice(0, idx).trim().toUpperCase();
      const value = line.slice(idx + 1).trim();
      values[key] = value;
    }
    return values;
  }

  private extractMesaRange(value: string | null) {
    if (!value) {
      return null;
    }
    const matches = value.match(/\d+/g);
    if (!matches || matches.length === 0) {
      return null;
    }
    const from = Number(matches[0]);
    const to = Number(matches[matches.length - 1]);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      return null;
    }
    return { from, to };
  }

  private pickCircuitCode(first: string | null, second: string | null) {
    const source = `${first ?? ""} ${second ?? ""}`.toUpperCase();
    const labeled = source.match(/CIRCUITO\s*(\d+\s*[A-Z]?)/);
    if (labeled) return labeled[1].replace(/\s+/g, "");
    const withLetter = source.match(/\b(\d+[AB])\b/);
    if (withLetter) return withLetter[1];
    const numeric = source.match(/\b(\d{1,2})\b/);
    return numeric ? numeric[1] : null;
  }

  private cleanText(value: string) {
    return `${value}`.replace(/\s+/g, " ").trim();
  }

  private ensureArray<T>(value: T | T[] | undefined): T[] {
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private toInt(value?: string | null) {
    if (!value) {
      return null;
    }
    const normalized = value.replace(/[^\d-]/g, "");
    if (!normalized) {
      return null;
    }
    const n = Number(normalized);
    return Number.isNaN(n) ? null : n;
  }

  private toFloat(value?: string | null) {
    if (!value) {
      return null;
    }
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
}
