import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @Length(2, 150)
  nombre!: string;

  @IsInt()
  @Min(2020)
  anio!: number;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  fechaEleccion?: string;
}
