import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Circuit } from "../territory/circuits/circuit.entity";
import { School } from "../territory/schools/school.entity";
import { Event } from "../operations/event.entity";
import { FiscalizationModule } from "../fiscalization/fiscalization.module";
import { MapService } from "./map.service";
import { MapController } from "./map.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TypeOrmModule.forFeature([Circuit, School, Event]), FiscalizationModule, AuditModule],
  providers: [MapService],
  controllers: [MapController]
})
export class MapModule {}
