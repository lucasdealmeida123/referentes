import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FiscalizationController } from "./fiscalization.controller";
import { FiscalizationService } from "./fiscalization.service";
import { Person } from "./person.entity";
import { RoleCatalog } from "./role.entity";
import { Assignment } from "./assignment.entity";
import { ElectionTable } from "../territory/tables/election-table.entity";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TypeOrmModule.forFeature([Person, RoleCatalog, Assignment, ElectionTable]), AuditModule],
  controllers: [FiscalizationController],
  providers: [FiscalizationService],
  exports: [FiscalizationService]
})
export class FiscalizationModule {}
