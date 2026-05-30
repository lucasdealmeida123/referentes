import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Campaign } from "../campaigns/campaign.entity";

@Entity("referents")
export class Referent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @Column({ length: 180 })
  nombreApellido!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  celular!: string | null;

  @Column({ type: "varchar", length: 250, nullable: true })
  direccion!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  barrio!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  chacra!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  circuitoCodigo!: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  ubicacionUrl!: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  referenteDe!: string | null;

  @Column({ type: "text", nullable: true })
  observacion!: string | null;
}
