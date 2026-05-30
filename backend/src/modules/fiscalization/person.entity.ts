import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Campaign } from "../campaigns/campaign.entity";

@Entity("people")
@Unique(["campaignId", "dni"])
export class Person {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @Column({ length: 20 })
  dni!: string;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ length: 120 })
  apellido!: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  telefono!: string | null;
}
