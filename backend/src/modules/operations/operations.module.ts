import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Event } from "./event.entity";
import { Referent } from "./referent.entity";
import { OperationsService } from "./operations.service";
import { OperationsController } from "./operations.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TypeOrmModule.forFeature([Event, Referent]), AuditModule],
  controllers: [OperationsController],
  providers: [OperationsService]
})
export class OperationsModule {}
