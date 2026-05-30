import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Campaign } from "../../campaigns/campaign.entity";
import { Circuit } from "../circuits/circuit.entity";
import { ElectionTable } from "../tables/election-table.entity";

@Entity("schools")
export class School {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @Column("uuid")
  circuitId!: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.schools, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @ManyToOne(() => Circuit, (circuit) => circuit.schools, { onDelete: "CASCADE" })
  @JoinColumn({ name: "circuitId" })
  circuit!: Circuit;

  @Column({ length: 180 })
  nombre!: string;

  @Column({ type: "varchar", length: 250, nullable: true })
  direccion!: string | null;

  @Column({ type: "float", nullable: true })
  lat!: number | null;

  @Column({ type: "float", nullable: true })
  lng!: number | null;

  @Column({ type: "int", default: 0 })
  cantMesasDeclaradas!: number;

  @OneToMany(() => ElectionTable, (table) => table.school)
  tables!: ElectionTable[];
}
