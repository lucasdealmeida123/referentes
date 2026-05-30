import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query } from "@nestjs/common";
import { FiscalizationService } from "./fiscalization.service";
import { CreatePersonDto } from "./dto/create-person.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { requireWriteRole } from "../security/security.utils";
import { AuditService } from "../audit/audit.service";

@Controller("fiscalization")
export class FiscalizationController {
  constructor(
    private readonly fiscalizationService: FiscalizationService,
    private readonly auditService: AuditService
  ) {}

  @Post("people")
  async createPerson(@Body() dto: CreatePersonDto, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.createPerson(dto);
    await this.auditService.log({
      module: "fiscalization",
      action: "create_person",
      campaignId: dto.campaignId,
      userRole: userRole ?? null
    });
    return result;
  }

  @Get("people")
  listPeople(@Query("campaignId") campaignId?: string) {
    return this.fiscalizationService.listPeople(campaignId);
  }

  @Put("people/:id")
  async updatePerson(@Param("id") id: string, @Body() dto: Partial<CreatePersonDto>, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.updatePerson(id, dto);
    await this.auditService.log({
      module: "fiscalization",
      action: "update_person",
      campaignId: dto.campaignId ?? null,
      userRole: userRole ?? null
    });
    return result;
  }

  @Delete("people/:id")
  async deletePerson(@Param("id") id: string, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.deletePerson(id);
    await this.auditService.log({
      module: "fiscalization",
      action: "delete_person",
      campaignId: result.campaignId,
      userRole: userRole ?? null
    });
    return { ok: true };
  }

  @Post("roles")
  async createRole(@Body() dto: CreateRoleDto, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.createRole(dto);
    await this.auditService.log({
      module: "fiscalization",
      action: "create_role",
      campaignId: dto.campaignId,
      userRole: userRole ?? null
    });
    return result;
  }

  @Get("roles")
  listRoles(@Query("campaignId") campaignId?: string) {
    return this.fiscalizationService.listRoles(campaignId);
  }

  @Put("roles/:id")
  async updateRole(@Param("id") id: string, @Body() dto: Partial<CreateRoleDto>, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.updateRole(id, dto);
    await this.auditService.log({
      module: "fiscalization",
      action: "update_role",
      campaignId: dto.campaignId ?? null,
      userRole: userRole ?? null
    });
    return result;
  }

  @Delete("roles/:id")
  async deleteRole(@Param("id") id: string, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.deleteRole(id);
    await this.auditService.log({
      module: "fiscalization",
      action: "delete_role",
      campaignId: result.campaignId,
      userRole: userRole ?? null
    });
    return { ok: true };
  }

  @Post("assignments")
  async createAssignment(@Body() dto: CreateAssignmentDto, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.createAssignment(dto);
    await this.auditService.log({
      module: "fiscalization",
      action: "create_assignment",
      campaignId: dto.campaignId,
      userRole: userRole ?? null,
      details: JSON.stringify({ tableId: dto.tableId, roleId: dto.roleId })
    });
    return result;
  }

  @Get("assignments")
  listAssignments(@Query("campaignId") campaignId?: string) {
    return this.fiscalizationService.listAssignments(campaignId);
  }

  @Put("assignments/:id")
  async updateAssignment(@Param("id") id: string, @Body() dto: Partial<CreateAssignmentDto>, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.updateAssignment(id, dto);
    await this.auditService.log({
      module: "fiscalization",
      action: "update_assignment",
      campaignId: dto.campaignId ?? null,
      userRole: userRole ?? null
    });
    return result;
  }

  @Delete("assignments/:id")
  async deleteAssignment(@Param("id") id: string, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.fiscalizationService.deleteAssignment(id);
    await this.auditService.log({
      module: "fiscalization",
      action: "delete_assignment",
      campaignId: result.campaignId,
      userRole: userRole ?? null
    });
    return { ok: true };
  }

  @Get("coverage")
  getCoverage(@Query("campaignId") campaignId: string) {
    return this.fiscalizationService.getCoverage(campaignId);
  }

  @Get("coverage/dashboard")
  getCoverageDashboard(@Query("campaignId") campaignId: string) {
    return this.fiscalizationService.getCoverageDashboard(campaignId);
  }
}
