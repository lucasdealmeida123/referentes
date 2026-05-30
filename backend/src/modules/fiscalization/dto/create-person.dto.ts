import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreatePersonDto {
  @IsUUID()
  campaignId!: string;

  @IsString()
  @Length(6, 20)
  dni!: string;

  @IsString()
  @Length(2, 120)
  nombre!: string;

  @IsString()
  @Length(2, 120)
  apellido!: string;

  @IsOptional()
  @IsString()
  @Length(6, 40)
  telefono?: string;
}
