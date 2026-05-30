import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from "class-validator";

export class CreateSchoolDto {
  @IsUUID()
  campaignId!: string;

  @IsUUID()
  circuitId!: string;

  @IsString()
  @Length(2, 180)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(2, 250)
  direccion?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantMesasDeclaradas?: number;
}
