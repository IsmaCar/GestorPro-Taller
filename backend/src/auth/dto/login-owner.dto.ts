import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginOwnerDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
