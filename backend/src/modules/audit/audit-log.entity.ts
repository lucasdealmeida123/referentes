import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid", { nullable: true })
  campaignId!: string | null;

  @Column({ length: 80 })
  module!: string;

  @Column({ length: 120 })
  action!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  userRole!: string | null;

  @Column({ type: "text", nullable: true })
  details!: string | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
