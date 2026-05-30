import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Campaign } from "../campaigns/campaign.entity";

@Entity("roles_catalog")
@Unique(["campaignId", "codigo"])
export class RoleCatalog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @Column({ length: 30 })
  codigo!: string;

  @Column({ length: 100 })
  nombre!: string;

  @Column({ length: 30, default: "mesa" })
  nivel!: string;
}
