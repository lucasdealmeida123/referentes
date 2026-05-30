import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Circuit } from "../territory/circuits/circuit.entity";
import { ElectionTable } from "../territory/tables/election-table.entity";
import { School } from "../territory/schools/school.entity";
import { Event } from "../operations/event.entity";
import { Referent } from "../operations/referent.entity";

@Entity("campaigns")
export class Campaign {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 150 })
  nombre!: string;

  @Column({ type: "int" })
  anio!: number;

  @Column({ length: 30, default: "draft" })
  estado!: string;

  @Column({ type: "date", nullable: true })
  fechaEleccion!: string | null;

  @OneToMany(() => Circuit, (circuit) => circuit.campaign)
  circuits!: Circuit[];

  @OneToMany(() => School, (school) => school.campaign)
  schools!: School[];

  @OneToMany(() => ElectionTable, (table) => table.campaign)
  tables!: ElectionTable[];

  @OneToMany(() => Event, (event) => event.campaign)
  events!: Event[];

  @OneToMany(() => Referent, (referent) => referent.campaign)
  referents!: Referent[];
}
