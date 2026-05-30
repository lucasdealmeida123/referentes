import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateTableDto {
  @IsUUID()
  campaignId!: string;

  @IsUUID()
  schoolId!: string;

  @IsInt()
  @Min(1)
  numero!: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  estadoCobertura?: string;
}
