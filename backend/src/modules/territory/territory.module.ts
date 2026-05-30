import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Circuit } from "./circuits/circuit.entity";
import { School } from "./schools/school.entity";
import { ElectionTable } from "./tables/election-table.entity";
import { TerritoryService } from "./territory.service";
import { TerritoryController } from "./territory.controller";
import { TerritoryImportService } from "./imports/territory-import.service";
import { TerritoryImportController } from "./imports/territory-import.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TypeOrmModule.forFeature([Circuit, School, ElectionTable]), AuditModule],
  providers: [TerritoryService, TerritoryImportService],
  controllers: [TerritoryController, TerritoryImportController]
})
export class TerritoryModule {}
