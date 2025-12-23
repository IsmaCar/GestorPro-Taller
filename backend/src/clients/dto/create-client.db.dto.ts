import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;
}
