import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Campaign } from "../campaigns/campaign.entity";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @Column({ length: 30 })
  tipo!: string;

  @Column({ type: "timestamp", nullable: true })
  fechaHora!: Date | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  lugar!: string | null;

  @Column({ type: "varchar", length: 250, nullable: true })
  direccion!: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  programa!: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  contacto!: string | null;

  @Column({ type: "text", nullable: true })
  observacion!: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  anfitrion!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  celular!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  barrio!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  circuitoCodigo!: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  referente!: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  ubicacionUrl!: string | null;

  @Column("double precision", { nullable: true })
  lat!: number | null;

  @Column("double precision", { nullable: true })
  lng!: number | null;

  @Column({ type: "varchar", length: 20, default: "pendiente" })
  estadoSolicitud!: string;

  @Column({ type: "timestamp", nullable: true })
  resueltoAt!: Date | null;

  @Column({ type: "text", nullable: true })
  resolucionNota!: string | null;

  /** IDs de referentes invitados/participantes de esta reunión */
  @Column({ type: "simple-json", nullable: true })
  referentIds!: string[] | null;

  /** IDs de referentes que efectivamente asistieron */
  @Column({ type: "simple-json", nullable: true })
  attendeeIds!: string[] | null;
}
