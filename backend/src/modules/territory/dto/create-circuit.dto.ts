import { IsInt, IsOptional, IsString, IsUUID, Length, Min } from "class-validator";

export class CreateCircuitDto {
  @IsUUID()
  campaignId!: string;

  @IsString()
  @Length(1, 10)
  codigo!: string;

  @IsString()
  @Length(2, 120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  zona?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  electoresNacionales?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  electoresExtranjeros?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadEscuelas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadMesas?: number;
}
