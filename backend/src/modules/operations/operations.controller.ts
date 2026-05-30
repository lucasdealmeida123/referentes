import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { OperationsService } from "./operations.service";
import { requireWriteRole } from "../security/security.utils";
import { AuditService } from "../audit/audit.service";

@Controller("operations")
export class OperationsController {
  constructor(
    private readonly operationsService: OperationsService,
    private readonly auditService: AuditService
  ) {}

  @Get("events")
  listEvents(@Query("campaignId") campaignId?: string) {
    return this.operationsService.listEvents(campaignId);
  }

  @Post("events")
  async createEvent(@Body() dto: any, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.operationsService.createEvent(dto);
    await this.auditService.log({
      module: "operations",
      action: "create_event",
      campaignId: dto?.campaignId ?? null,
      userRole: userRole ?? null
    });
    return result;
  }

  @Put("events/:id")
  async updateEvent(@Param("id") id: string, @Body() dto: any, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.operationsService.updateEvent(id, dto);
    await this.auditService.log({
      module: "operations",
      action: "update_event",
      campaignId: dto?.campaignId ?? null,
      userRole: userRole ?? null
    });
    return result;
  }

  @Delete("events/:id")
  async deleteEvent(@Param("id") id: string, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    return this.operationsService.deleteEvent(id);
  }

  @Get("referents")
  listReferents(@Query("campaignId") campaignId?: string) {
    return this.operationsService.listReferents(campaignId);
  }

  @Post("referents")
  async createReferent(@Body() dto: any, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.operationsService.createReferent(dto);
    await this.auditService.log({
      module: "operations",
      action: "create_referent",
      campaignId: dto?.campaignId ?? null,
      userRole: userRole ?? null
    });
    return result;
  }

  @Put("referents/:id")
  async updateReferent(@Param("id") id: string, @Body() dto: any, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    const result = await this.operationsService.updateReferent(id, dto);
    await this.auditService.log({
      module: "operations",
      action: "update_referent",
      campaignId: dto?.campaignId ?? null,
      userRole: userRole ?? null
    });
    return result;
  }

  @Delete("referents/:id")
  async deleteReferent(@Param("id") id: string, @Headers("x-user-role") userRole?: string) {
    requireWriteRole(userRole);
    return this.operationsService.deleteReferent(id);
  }

  @Post("imports/reuniones/preview")
  @UseInterceptors(FileInterceptor("file"))
  previewReuniones(@UploadedFile() file: any) {
    return this.operationsService.previewReuniones(file);
  }

  @Post("imports/reuniones/commit")
  @UseInterceptors(FileInterceptor("file"))
  async commitReuniones(
    @Body("campaignId") campaignId: string,
    @UploadedFile() file: any,
    @Headers("x-user-role") userRole?: string
  ) {
    requireWriteRole(userRole);
    const result = await this.operationsService.commitReuniones(campaignId, file);
    await this.auditService.log({
      module: "operations_import",
      action: "reuniones_commit",
      campaignId,
      userRole: userRole ?? null,
      details: JSON.stringify(result)
    });
    return result;
  }

  @Post("imports/referentes/preview")
  @UseInterceptors(FileInterceptor("file"))
  previewReferentes(@UploadedFile() file: any) {
    return this.operationsService.previewReferentes(file);
  }

  @Post("imports/referentes/commit")
  @UseInterceptors(FileInterceptor("file"))
  async commitReferentes(
    @Body("campaignId") campaignId: string,
    @UploadedFile() file: any,
    @Headers("x-user-role") userRole?: string
  ) {
    requireWriteRole(userRole);
    const result = await this.operationsService.commitReferentes(campaignId, file);
    await this.auditService.log({
      module: "operations_import",
      action: "referentes_commit",
      campaignId,
      userRole: userRole ?? null,
      details: JSON.stringify(result)
    });
    return result;
  }
}
