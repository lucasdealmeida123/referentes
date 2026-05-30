import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateRoleDto {
  @IsUUID()
  campaignId!: string;

  @IsString()
  @Length(2, 30)
  codigo!: string;

  @IsString()
  @Length(2, 100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(2, 30)
  nivel?: string;
}
