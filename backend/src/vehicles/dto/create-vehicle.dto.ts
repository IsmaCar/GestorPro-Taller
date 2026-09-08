import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateVehicleDto {
  @IsNotEmpty()
  @IsUUID()
  clientId!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  @Matches(/^[A-Za-z0-9\- ]+$/, {
    message: 'licensePlate must contain only alphanumeric characters, hyphens, and spaces',
  })
  @Transform(({ value }) => (value ? value.toUpperCase().trim() : value))
  licensePlate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;
}
