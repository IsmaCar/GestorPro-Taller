import { StateOrder } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateWorkOrderDto {
  @IsString()
  @Length(5, 200)
  @IsOptional()
  description?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  assignedMechanic?: string;

  @IsString()
  @IsEnum(StateOrder)
  @IsOptional()
  state?: StateOrder;
}
