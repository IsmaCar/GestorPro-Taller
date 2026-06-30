import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { StateOrder } from '@prisma/client';

export class CreateWorkOrderDto {
  @IsUUID()
  vehicleId!: string;

  @IsUUID()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 2000)
  description!: string;

  @IsOptional()
  @IsUUID()
  assignedMechanic?: string;

  @IsOptional()
  @IsISO8601()
  openingDate?: string;

  @IsOptional()
  @IsEnum(StateOrder)
  state?: StateOrder;
}
