import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Campaign } from "../campaigns/campaign.entity";
import { Person } from "./person.entity";
import { RoleCatalog } from "./role.entity";
import { Circuit } from "../territory/circuits/circuit.entity";
import { School } from "../territory/schools/school.entity";
import { ElectionTable } from "../territory/tables/election-table.entity";

@Entity("assignments")
export class Assignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  campaignId!: string;

  @Column("uuid")
  personId!: string;

  @Column("uuid")
  roleId!: string;

  @Column("uuid", { nullable: true })
  circuitId!: string | null;

  @Column("uuid", { nullable: true })
  schoolId!: string | null;

  @Column("uuid", { nullable: true })
  tableId!: string | null;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign!: Campaign;

  @ManyToOne(() => Person, { onDelete: "CASCADE" })
  @JoinColumn({ name: "personId" })
  person!: Person;

  @ManyToOne(() => RoleCatalog, { onDelete: "CASCADE" })
  @JoinColumn({ name: "roleId" })
  role!: RoleCatalog;

  @ManyToOne(() => Circuit, { onDelete: "SET NULL" })
  @JoinColumn({ name: "circuitId" })
  circuit!: Circuit | null;

  @ManyToOne(() => School, { onDelete: "SET NULL" })
  @JoinColumn({ name: "schoolId" })
  school!: School | null;

  @ManyToOne(() => ElectionTable, { onDelete: "SET NULL" })
  @JoinColumn({ name: "tableId" })
  table!: ElectionTable | null;

  @Column({ length: 30, default: "activo" })
  estado!: string;
}
