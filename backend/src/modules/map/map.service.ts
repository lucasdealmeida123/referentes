import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Circuit } from "../territory/circuits/circuit.entity";
import { School } from "../territory/schools/school.entity";
import { Event } from "../operations/event.entity";
import { FiscalizationService } from "../fiscalization/fiscalization.service";

type MapFilters = {
  circuitCode?: string;
  schoolId?: string;
  coverageStatus?: string;
  eventType?: string;
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  allowedCircuits?: string[];
};

@Injectable()
export class MapService {
  constructor(
    @InjectRepository(Circuit)
    private readonly circuitRepository: Repository<Circuit>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly fiscalizationService: FiscalizationService
  ) {}

  async getDataset(campaignId: string, filters: MapFilters) {
    const circuits = await this.circuitRepository.find({
      where: { campaignId },
      order: { codigo: "ASC" }
    });
    const schools = await this.schoolRepository.find({
      where: { campaignId },
      relations: ["circuit"],
      order: { nombre: "ASC" }
    });
    const events = await this.eventRepository.find({
      where: { campaignId },
      order: { fechaHora: "ASC" }
    });
    const coverage = await this.fiscalizationService.getCoverage(campaignId);

    const coverageBySchool = new Map<string, { criticas: number; parciales: number; optimas: number }>();
    for (const row of coverage.tables) {
      if (!row.schoolId) continue;
      const current = coverageBySchool.get(row.schoolId) ?? { criticas: 0, parciales: 0, optimas: 0 };
      if (row.estado === "optimo") current.optimas += 1;
      else if (row.estado === "parcial") current.parciales += 1;
      else current.criticas += 1;
      coverageBySchool.set(row.schoolId, current);
    }

    const filteredSchools = schools.filter((school) => {
      if (filters.allowedCircuits?.length && !filters.allowedCircuits.includes((school.circuit?.codigo ?? "").toUpperCase())) {
        return false;
      }
      if (filters.schoolId && school.id !== filters.schoolId) return false;
      if (filters.circuitCode && school.circuit?.codigo !== filters.circuitCode) return false;
      if (filters.coverageStatus) {
        const c = coverageBySchool.get(school.id) ?? { criticas: 0, parciales: 0, optimas: 0 };
        const currentStatus = c.criticas > 0 ? "critico" : c.parciales > 0 ? "parcial" : "optimo";
        if (currentStatus !== filters.coverageStatus) return false;
      }
      return true;
    });

    const filteredEvents = events.filter((event) => {
      if (filters.allowedCircuits?.length) {
        const eventCircuit = (event.circuitoCodigo ?? "").toUpperCase();
        if (!filters.allowedCircuits.includes(eventCircuit)) return false;
      }
      if (filters.eventType && event.tipo.toLowerCase() !== filters.eventType.toLowerCase()) return false;
      if (filters.circuitCode && event.circuitoCodigo !== filters.circuitCode) return false;
      if (filters.centerLat != null && filters.centerLng != null && filters.radiusKm != null && filters.radiusKm > 0) {
        if (event.lat == null || event.lng == null) return false;
        const km = this.distanceKm(filters.centerLat, filters.centerLng, event.lat, event.lng);
        if (km > filters.radiusKm) return false;
      }
      return true;
    });

    return {
      campaignId,
      filters,
      circuits: circuits
        .filter((circuit) =>
          filters.allowedCircuits?.length
            ? filters.allowedCircuits.includes(circuit.codigo.toUpperCase())
            : true
        )
        .map((circuit) => ({
        id: circuit.id,
        codigo: circuit.codigo,
        nombre: circuit.nombre,
        zona: circuit.zona,
        electoresNacionales: circuit.electoresNacionales,
        electoresExtranjeros: circuit.electoresExtranjeros,
        cantidadEscuelas: circuit.cantidadEscuelas,
        cantidadMesas: circuit.cantidadMesas,
          polygon: this.toGeoJsonPolygon(circuit.polygonCoordinates)
        })),
      schools: filteredSchools.map((school) => {
        const c = coverageBySchool.get(school.id) ?? { criticas: 0, parciales: 0, optimas: 0 };
        const estadoCobertura = c.criticas > 0 ? "critico" : c.parciales > 0 ? "parcial" : "optimo";
        return {
          id: school.id,
          nombre: school.nombre,
          direccion: school.direccion,
          circuitId: school.circuitId,
          circuitoCodigo: school.circuit?.codigo ?? null,
          lat: school.lat,
          lng: school.lng,
          coverage: {
            ...c,
            estado: estadoCobertura
          }
        };
      }),
      events: filteredEvents.map((event) => ({
        id: event.id,
        tipo: event.tipo,
        fechaHora: event.fechaHora,
        lugar: event.lugar,
        direccion: event.direccion,
        lat: event.lat,
        lng: event.lng,
        circuitoCodigo: event.circuitoCodigo,
        barrio: event.barrio,
        referente: event.referente,
        ubicacionUrl: event.ubicacionUrl,
        estadoSolicitud: event.estadoSolicitud,
        resolucionNota: event.resolucionNota
      })),
      coverageSummary: coverage.resumen
    };
  }

  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toGeoJsonPolygon(raw: string | null) {
    if (!raw) return null;
    // Prefer stored JSON format ({"type":"Polygon","coordinates":[...]})
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.type === "Polygon" && Array.isArray(parsed?.coordinates)) {
        return parsed as { type: "Polygon"; coordinates: number[][][] };
      }
    } catch {
      // fall through to legacy space-separated format
    }
    // Legacy: "lng,lat lng,lat ..."
    const points = raw
      .trim()
      .split(/\s+/)
      .map((chunk) => chunk.split(","))
      .filter((parts) => parts.length >= 2)
      .map((parts) => [Number(parts[0]), Number(parts[1])])
      .filter((coords) => !Number.isNaN(coords[0]) && !Number.isNaN(coords[1]));
    if (points.length < 3) return null;
    return {
      type: "Polygon" as const,
      coordinates: [points]
    };
  }
}
