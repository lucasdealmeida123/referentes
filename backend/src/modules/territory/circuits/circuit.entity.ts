import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Campaign } from "../../campaigns/campaign.entity";
import { School } from "../schools/school.entity";

@Entity("circuits")
export class Circuit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.circuits, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @Column({ length: 10 })
  codigo!: string;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  zona!: string | null;

  @Column({ type: "int", default: 0 })
  electoresNacionales!: number;

  @Column({ type: "int", default: 0 })
  electoresExtranjeros!: number;

  @Column({ type: "int", default: 0 })
  cantidadEscuelas!: number;

  @Column({ type: "int", default: 0 })
  cantidadMesas!: number;

  @Column({ type: "text", nullable: true })
  polygonCoordinates!: string | null;

  @OneToMany(() => School, (school) => school.circuit)
  schools!: School[];
}
