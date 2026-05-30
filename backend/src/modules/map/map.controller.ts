import { Controller, Get, Headers, Query } from "@nestjs/common";
import { MapService } from "./map.service";
import { parseAllowedCircuits } from "../security/security.utils";
import { AuditService } from "../audit/audit.service";

@Controller("map")
export class MapController {
  constructor(
    private readonly mapService: MapService,
    private readonly auditService: AuditService
  ) {}

  @Get("dataset")
  async dataset(
    @Query("campaignId") campaignId: string,
    @Query("circuitCode") circuitCode?: string,
    @Query("schoolId") schoolId?: string,
    @Query("coverageStatus") coverageStatus?: string,
    @Query("eventType") eventType?: string,
    @Query("centerLat") centerLat?: string,
    @Query("centerLng") centerLng?: string,
    @Query("radiusKm") radiusKm?: string,
    @Headers("x-territory-circuits") territoryCircuits?: string,
    @Headers("x-user-role") userRole?: string
  ) {
    const allowedCircuits = parseAllowedCircuits(territoryCircuits);
    const result = await this.mapService.getDataset(campaignId, {
      circuitCode,
      schoolId,
      coverageStatus,
      eventType,
      centerLat: centerLat ? Number(centerLat) : undefined,
      centerLng: centerLng ? Number(centerLng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      allowedCircuits
    });
    await this.auditService.log({
      module: "map",
      action: "dataset_read",
      campaignId,
      userRole: userRole ?? null,
      details: JSON.stringify({ circuitCode, schoolId, coverageStatus, eventType, centerLat, centerLng, radiusKm, allowedCircuits })
    });
    return result;
  }
}
