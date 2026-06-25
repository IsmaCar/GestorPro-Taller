import { StateOrder } from '@prisma/client';
import { IsEnum, IsString, IsUUID, Length } from 'class-validator';

export class UpdateWorkOrderDto {
  @IsString()
  @Length(5, 200)
  description?: string;

  @IsString()
  @IsUUID()
  assignedMechanic?: string;

  @IsString()
  @IsEnum(StateOrder)
  state?: StateOrder;
}
