import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { TerritoryService } from "./territory.service";
import { CreateCircuitDto } from "./dto/create-circuit.dto";
import { CreateSchoolDto } from "./dto/create-school.dto";
import { CreateTableDto } from "./dto/create-table.dto";

@Controller()
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  @Post("circuits")
  createCircuit(@Body() dto: CreateCircuitDto) {
    return this.territoryService.createCircuit(dto);
  }

  @Get("circuits")
  findCircuits(@Query("campaignId") campaignId?: string) {
    return this.territoryService.findCircuits(campaignId);
  }

  @Put("circuits/:id")
  updateCircuit(@Param("id") id: string, @Body() dto: Partial<CreateCircuitDto>) {
    return this.territoryService.updateCircuit(id, dto);
  }

  @Post("schools")
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.territoryService.createSchool(dto);
  }

  @Get("schools")
  findSchools(
    @Query("campaignId") campaignId?: string,
    @Query("circuitId") circuitId?: string
  ) {
    return this.territoryService.findSchools(campaignId, circuitId);
  }

  @Put("schools/:id")
  updateSchool(@Param("id") id: string, @Body() dto: Partial<CreateSchoolDto>) {
    return this.territoryService.updateSchool(id, dto);
  }

  @Post("tables")
  createTable(@Body() dto: CreateTableDto) {
    return this.territoryService.createTable(dto);
  }

  @Get("tables")
  findTables(
    @Query("campaignId") campaignId?: string,
    @Query("schoolId") schoolId?: string
  ) {
    return this.territoryService.findTables(campaignId, schoolId);
  }

  @Put("tables/:id")
  updateTable(@Param("id") id: string, @Body() dto: Partial<CreateTableDto>) {
    return this.territoryService.updateTable(id, dto);
  }
}
