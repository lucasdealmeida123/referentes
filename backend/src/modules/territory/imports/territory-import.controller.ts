import { Body, Controller, Headers, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TerritoryImportService } from "./territory-import.service";
import { requireWriteRole } from "../../security/security.utils";
import { AuditService } from "../../audit/audit.service";

@Controller("imports/territory")
export class TerritoryImportController {
  constructor(
    private readonly territoryImportService: TerritoryImportService,
    private readonly auditService: AuditService
  ) {}

  @Post("kmz/preview")
  @UseInterceptors(FileInterceptor("file"))
  preview(@UploadedFile() file: any) {
    return this.territoryImportService.previewFromFile(file);
  }

  @Post("kmz/commit")
  @UseInterceptors(FileInterceptor("file"))
  async commit(
    @UploadedFile() file: any,
    @Body("campaignId") campaignId: string,
    @Headers("x-user-role") userRole?: string
  ) {
    requireWriteRole(userRole);
    const result = await this.territoryImportService.commitFromFile(campaignId, file);
    await this.auditService.log({
      module: "territory_import",
      action: "kmz_commit",
      campaignId,
      userRole: userRole ?? null,
      details: JSON.stringify(result.summary)
    });
    return result;
  }
}
