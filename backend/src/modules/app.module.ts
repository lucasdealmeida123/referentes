import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthController } from "./health.controller";
import { Campaign } from "./campaigns/campaign.entity";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { Circuit } from "./territory/circuits/circuit.entity";
import { School } from "./territory/schools/school.entity";
import { ElectionTable } from "./territory/tables/election-table.entity";
import { TerritoryModule } from "./territory/territory.module";
import { Person } from "./fiscalization/person.entity";
import { RoleCatalog } from "./fiscalization/role.entity";
import { Assignment } from "./fiscalization/assignment.entity";
import { FiscalizationModule } from "./fiscalization/fiscalization.module";
import { Event } from "./operations/event.entity";
import { Referent } from "./operations/referent.entity";
import { OperationsModule } from "./operations/operations.module";
import { MapModule } from "./map/map.module";
import { AuditLog } from "./audit/audit-log.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "db",
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || "elecciones",
      password: process.env.DB_PASSWORD || "elecciones",
      database: process.env.DB_NAME || "elecciones",
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === "true",
      entities: [
        Campaign,
        Circuit,
        School,
        ElectionTable,
        Person,
        RoleCatalog,
        Assignment,
        Event,
        Referent,
        AuditLog
      ]
    }),
    CampaignsModule,
    TerritoryModule,
    FiscalizationModule,
    OperationsModule,
    MapModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
