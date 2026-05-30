import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Campaign } from "../../campaigns/campaign.entity";
import { School } from "../schools/school.entity";

@Entity("tables")
@Unique(["campaignId", "schoolId", "numero"])
export class ElectionTable {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @Column("uuid")
  schoolId!: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.tables, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @ManyToOne(() => School, (school) => school.tables, { onDelete: "CASCADE" })
  @JoinColumn({ name: "schoolId" })
  school!: School;

  @Column({ type: "int" })
  numero!: number;

  @Column({ length: 20, default: "nacional" })
  tipo!: string;

  @Column({ length: 20, default: "critico" })
  estadoCobertura!: string;
}
