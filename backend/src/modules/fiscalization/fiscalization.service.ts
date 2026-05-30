import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Person } from "./person.entity";
import { RoleCatalog } from "./role.entity";
import { Assignment } from "./assignment.entity";
import { CreatePersonDto } from "./dto/create-person.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { ElectionTable } from "../territory/tables/election-table.entity";

@Injectable()
export class FiscalizationService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(RoleCatalog)
    private readonly roleRepository: Repository<RoleCatalog>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(ElectionTable)
    private readonly tableRepository: Repository<ElectionTable>
  ) {}

  createPerson(dto: CreatePersonDto) {
    const normalizedDni = dto.dni.replace(/[^\d]/g, "");
    if (!normalizedDni) {
      throw new BadRequestException("DNI invalido");
    }
    return this.personRepository.save(
      this.personRepository.create({
        ...dto,
        dni: normalizedDni,
        telefono: dto.telefono ?? null
      })
    );
  }

  async updatePerson(id: string, dto: Partial<CreatePersonDto>) {
    const person = await this.personRepository.findOneBy({ id });
    if (!person) throw new NotFoundException("Persona no encontrada");
    const dni = dto.dni ? dto.dni.replace(/[^\d]/g, "") : person.dni;
    if (!dni) throw new BadRequestException("DNI invalido");
    Object.assign(person, {
      ...dto,
      dni,
      telefono: dto.telefono ?? person.telefono ?? null
    });
    return this.personRepository.save(person);
  }

  async deletePerson(id: string) {
    const person = await this.personRepository.findOneBy({ id });
    if (!person) throw new NotFoundException("Persona no encontrada");
    await this.personRepository.delete({ id });
    return person;
  }

  listPeople(campaignId?: string) {
    return this.personRepository.find({
      where: campaignId ? { campaignId } : {},
      order: { apellido: "ASC", nombre: "ASC" }
    });
  }

  createRole(dto: CreateRoleDto) {
    return this.roleRepository.save(
      this.roleRepository.create({
        ...dto,
        codigo: dto.codigo.trim().toUpperCase(),
        nivel: dto.nivel ?? "mesa"
      })
    );
  }

  async updateRole(id: string, dto: Partial<CreateRoleDto>) {
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) throw new NotFoundException("Rol no encontrado");
    Object.assign(role, {
      ...dto,
      codigo: dto.codigo ? dto.codigo.trim().toUpperCase() : role.codigo,
      nivel: dto.nivel ?? role.nivel
    });
    return this.roleRepository.save(role);
  }

  async deleteRole(id: string) {
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) throw new NotFoundException("Rol no encontrado");
    await this.roleRepository.delete({ id });
    return role;
  }

  listRoles(campaignId?: string) {
    return this.roleRepository.find({
      where: campaignId ? { campaignId } : {},
      order: { nombre: "ASC" }
    });
  }

  async createAssignment(dto: CreateAssignmentDto) {
    const person = await this.personRepository.findOneBy({ id: dto.personId, campaignId: dto.campaignId });
    if (!person) {
      throw new NotFoundException("Persona no encontrada en la campana");
    }

    const role = await this.roleRepository.findOneBy({ id: dto.roleId, campaignId: dto.campaignId });
    if (!role) {
      throw new NotFoundException("Rol no encontrado en la campana");
    }

    if (!dto.tableId && role.nivel === "mesa") {
      throw new BadRequestException("Para roles de nivel mesa se requiere tableId");
    }

    if (dto.tableId) {
      const table = await this.tableRepository.findOne({
        where: { id: dto.tableId, campaignId: dto.campaignId },
        relations: ["school"]
      });
      if (!table) {
        throw new NotFoundException("Mesa no encontrada para la campana");
      }

      // Hereda territorialidad desde la mesa para evitar inconsistencias.
      dto.schoolId = table.schoolId;
      dto.circuitId = table.school?.circuitId ?? dto.circuitId;
    }

    if (dto.estado === "activo" || !dto.estado) {
      const duplicate = await this.assignmentRepository.findOne({
        where: {
          campaignId: dto.campaignId,
          roleId: dto.roleId,
          tableId: dto.tableId ?? IsNull(),
          personId: dto.personId,
          estado: "activo"
        }
      });
      if (duplicate) {
        throw new ConflictException("La asignacion ya existe como activa");
      }
    }

    return this.assignmentRepository.save(
      this.assignmentRepository.create({
        ...dto,
        circuitId: dto.circuitId ?? null,
        schoolId: dto.schoolId ?? null,
        tableId: dto.tableId ?? null,
        estado: dto.estado ?? "activo"
      })
    );
  }

  listAssignments(campaignId?: string) {
    return this.assignmentRepository.find({
      where: campaignId ? { campaignId } : {},
      order: { estado: "ASC" }
    });
  }

  async updateAssignment(id: string, dto: Partial<CreateAssignmentDto>) {
    const assignment = await this.assignmentRepository.findOneBy({ id });
    if (!assignment) throw new NotFoundException("Asignacion no encontrada");
    const payload: CreateAssignmentDto = {
      campaignId: dto.campaignId ?? assignment.campaignId,
      personId: dto.personId ?? assignment.personId,
      roleId: dto.roleId ?? assignment.roleId,
      circuitId: dto.circuitId ?? assignment.circuitId ?? undefined,
      schoolId: dto.schoolId ?? assignment.schoolId ?? undefined,
      tableId: dto.tableId ?? assignment.tableId ?? undefined,
      estado: dto.estado ?? assignment.estado
    };

    const person = await this.personRepository.findOneBy({ id: payload.personId, campaignId: payload.campaignId });
    if (!person) throw new NotFoundException("Persona no encontrada en la campana");

    const role = await this.roleRepository.findOneBy({ id: payload.roleId, campaignId: payload.campaignId });
    if (!role) throw new NotFoundException("Rol no encontrado en la campana");

    if (!payload.tableId && role.nivel === "mesa") {
      throw new BadRequestException("Para roles de nivel mesa se requiere tableId");
    }

    if (payload.tableId) {
      const table = await this.tableRepository.findOne({
        where: { id: payload.tableId, campaignId: payload.campaignId },
        relations: ["school"]
      });
      if (!table) throw new NotFoundException("Mesa no encontrada para la campana");
      payload.schoolId = table.schoolId;
      payload.circuitId = table.school?.circuitId ?? payload.circuitId;
    }

    if (payload.estado === "activo" || !payload.estado) {
      const duplicate = await this.assignmentRepository.findOne({
        where: {
          campaignId: payload.campaignId,
          roleId: payload.roleId,
          tableId: payload.tableId ?? IsNull(),
          personId: payload.personId,
          estado: "activo"
        }
      });
      if (duplicate && duplicate.id !== assignment.id) {
        throw new ConflictException("La asignacion ya existe como activa");
      }
    }

    Object.assign(assignment, {
      ...payload,
      circuitId: payload.circuitId ?? null,
      schoolId: payload.schoolId ?? null,
      tableId: payload.tableId ?? null
    });
    return this.assignmentRepository.save(assignment);
  }

  async deleteAssignment(id: string) {
    const assignment = await this.assignmentRepository.findOneBy({ id });
    if (!assignment) throw new NotFoundException("Asignacion no encontrada");
    await this.assignmentRepository.delete({ id });
    return assignment;
  }

  async getCoverage(campaignId: string) {
    const tables = await this.tableRepository.find({
      where: { campaignId },
      relations: ["school", "school.circuit"]
    });
    const assignments = await this.assignmentRepository.find({
      where: { campaignId, estado: "activo" },
      relations: ["role"]
    });

    const byTable = new Map<string, { titular: number; suplente: number }>();
    for (const assignment of assignments) {
      if (!assignment.tableId) {
        continue;
      }
      const coverageType = this.resolveCoverageRoleType(
        assignment.role?.codigo ?? "",
        assignment.role?.nombre ?? ""
      );
      if (!coverageType) {
        continue;
      }
      const row = byTable.get(assignment.tableId) ?? { titular: 0, suplente: 0 };
      if (coverageType === "titular") {
        row.titular += 1;
      }
      if (coverageType === "suplente") {
        row.suplente += 1;
      }
      byTable.set(assignment.tableId, row);
    }

    const status = tables.map((table) => {
      const coverage = byTable.get(table.id) ?? { titular: 0, suplente: 0 };
      let estado = "critico";
      if (coverage.titular > 0 && coverage.suplente > 0) {
        estado = "optimo";
      } else if (coverage.titular > 0) {
        estado = "parcial";
      }
      return {
        tableId: table.id,
        mesaNumero: table.numero,
        schoolId: table.schoolId,
        schoolNombre: table.school?.nombre ?? null,
        circuitId: table.school?.circuitId ?? null,
        circuito: table.school?.circuit?.codigo ?? null,
        titulares: coverage.titular,
        suplentes: coverage.suplente,
        estado
      };
    });

    return {
      campaignId,
      resumen: {
        mesasTotales: status.length,
        criticas: status.filter((row) => row.estado === "critico").length,
        parciales: status.filter((row) => row.estado === "parcial").length,
        optimas: status.filter((row) => row.estado === "optimo").length,
        mesasConTitular: status.filter((row) => row.titulares > 0).length,
        mesasConSuplente: status.filter((row) => row.suplentes > 0).length
      },
      tables: status
    };
  }

  async getCoverageDashboard(campaignId: string) {
    const coverage = await this.getCoverage(campaignId);
    const byCircuit = new Map<
      string,
      { circuito: string; mesasTotales: number; criticas: number; parciales: number; optimas: number }
    >();
    const bySchool = new Map<
      string,
      { schoolId: string; schoolNombre: string; circuito: string; mesasTotales: number; criticas: number; parciales: number; optimas: number }
    >();

    for (const table of coverage.tables) {
      const circuitKey = table.circuito ?? "SIN_CIRCUITO";
      const cRow = byCircuit.get(circuitKey) ?? {
        circuito: circuitKey,
        mesasTotales: 0,
        criticas: 0,
        parciales: 0,
        optimas: 0
      };
      cRow.mesasTotales += 1;
      this.increaseStatusCounter(cRow, table.estado);
      byCircuit.set(circuitKey, cRow);

      const schoolKey = table.schoolId ?? "SIN_ESCUELA";
      const sRow = bySchool.get(schoolKey) ?? {
        schoolId: schoolKey,
        schoolNombre: table.schoolNombre ?? "SIN_ESCUELA",
        circuito: circuitKey,
        mesasTotales: 0,
        criticas: 0,
        parciales: 0,
        optimas: 0
      };
      sRow.mesasTotales += 1;
      this.increaseStatusCounter(sRow, table.estado);
      bySchool.set(schoolKey, sRow);
    }

    return {
      campaignId,
      resumen: coverage.resumen,
      porCircuito: Array.from(byCircuit.values()).sort((a, b) => a.circuito.localeCompare(b.circuito)),
      porEscuela: Array.from(bySchool.values()).sort((a, b) => b.criticas - a.criticas)
    };
  }

  private increaseStatusCounter(
    row: { criticas: number; parciales: number; optimas: number },
    status: string
  ) {
    if (status === "optimo") {
      row.optimas += 1;
      return;
    }
    if (status === "parcial") {
      row.parciales += 1;
      return;
    }
    row.criticas += 1;
  }

  private resolveCoverageRoleType(codigo: string, nombre: string): "titular" | "suplente" | null {
    const normalized = `${codigo} ${nombre}`
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();

    if (normalized.includes("SUPLENTE")) return "suplente";
    if (normalized.includes("TITULAR")) return "titular";
    return null;
  }
}
