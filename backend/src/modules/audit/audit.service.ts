import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "./audit-log.entity";

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>
  ) {}

  log(params: {
    module: string;
    action: string;
    campaignId?: string | null;
    userRole?: string | null;
    details?: string | null;
  }) {
    return this.auditRepository.save(
      this.auditRepository.create({
        campaignId: params.campaignId ?? null,
        module: params.module,
        action: params.action,
        userRole: params.userRole ?? null,
        details: params.details ?? null
      })
    );
  }
}
