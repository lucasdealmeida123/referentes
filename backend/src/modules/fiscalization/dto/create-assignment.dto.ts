import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateAssignmentDto {
  @IsUUID()
  campaignId!: string;

  @IsUUID()
  personId!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  circuitId?: string;

  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 30)
  estado?: string;
}
