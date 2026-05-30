import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Circuit } from "./circuits/circuit.entity";
import { School } from "./schools/school.entity";
import { ElectionTable } from "./tables/election-table.entity";
import { CreateCircuitDto } from "./dto/create-circuit.dto";
import { CreateSchoolDto } from "./dto/create-school.dto";
import { CreateTableDto } from "./dto/create-table.dto";

@Injectable()
export class TerritoryService {
  constructor(
    @InjectRepository(Circuit)
    private readonly circuitRepository: Repository<Circuit>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(ElectionTable)
    private readonly tableRepository: Repository<ElectionTable>
  ) {}

  createCircuit(dto: CreateCircuitDto) {
    const circuit = this.circuitRepository.create({
      ...dto,
      zona: dto.zona ?? null,
      electoresNacionales: dto.electoresNacionales ?? 0,
      electoresExtranjeros: dto.electoresExtranjeros ?? 0,
      cantidadEscuelas: dto.cantidadEscuelas ?? 0,
      cantidadMesas: dto.cantidadMesas ?? 0
    });
    return this.circuitRepository.save(circuit);
  }

  findCircuits(campaignId?: string) {
    return this.circuitRepository.find({
      where: campaignId ? { campaignId } : {},
      order: { codigo: "ASC" }
    });
  }

  async updateCircuit(id: string, dto: Partial<CreateCircuitDto>) {
    const circuit = await this.circuitRepository.findOneBy({ id });
    if (!circuit) {
      throw new NotFoundException("Circuito no encontrado");
    }
    Object.assign(circuit, dto);
    return this.circuitRepository.save(circuit);
  }

  async createSchool(dto: CreateSchoolDto) {
    if (dto.circuitId) {
      const circuit = await this.circuitRepository.findOneBy({ id: dto.circuitId });
      if (!circuit) throw new NotFoundException("Circuito no encontrado");
    }

    const school = this.schoolRepository.create({
      ...dto,
      direccion: dto.direccion ?? null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      cantMesasDeclaradas: dto.cantMesasDeclaradas ?? 0
    });
    return this.schoolRepository.save(school);
  }

  findSchools(campaignId?: string, circuitId?: string) {
    return this.schoolRepository.find({
      where: {
        ...(campaignId ? { campaignId } : {}),
        ...(circuitId ? { circuitId } : {})
      },
      order: { nombre: "ASC" }
    });
  }

  async updateSchool(id: string, dto: Partial<CreateSchoolDto>) {
    const school = await this.schoolRepository.findOneBy({ id });
    if (!school) {
      throw new NotFoundException("Escuela no encontrada");
    }
    if (dto.circuitId) {
      const circuit = await this.circuitRepository.findOneBy({ id: dto.circuitId });
      if (!circuit) {
        throw new NotFoundException("Circuito no encontrado");
      }
    }
    Object.assign(school, dto);
    return this.schoolRepository.save(school);
  }

  async createTable(dto: CreateTableDto) {
    const school = await this.schoolRepository.findOneBy({ id: dto.schoolId });
    if (!school) {
      throw new NotFoundException("Escuela no encontrada");
    }

    const table = this.tableRepository.create({
      ...dto,
      tipo: dto.tipo ?? "nacional",
      estadoCobertura: dto.estadoCobertura ?? "critico"
    });
    return this.tableRepository.save(table);
  }

  findTables(campaignId?: string, schoolId?: string) {
    return this.tableRepository.find({
      where: {
        ...(campaignId ? { campaignId } : {}),
        ...(schoolId ? { schoolId } : {})
      },
      order: { numero: "ASC" }
    });
  }

  async updateTable(id: string, dto: Partial<CreateTableDto>) {
    const table = await this.tableRepository.findOneBy({ id });
    if (!table) {
      throw new NotFoundException("Mesa no encontrada");
    }
    Object.assign(table, dto);
    return this.tableRepository.save(table);
  }
}
