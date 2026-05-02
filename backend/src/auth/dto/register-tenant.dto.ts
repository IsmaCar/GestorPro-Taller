import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  garageName!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+\s+[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+\s+[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+.*$/, {
    message: 'el nombre del dueño debe contener el nombre y sus dos apellidos',
  })
  adminName!: string;

  @IsNotEmpty()
  @IsString()
  fiscalId!: string;

  @IsNotEmpty()
  @IsEmail()
  adminEmail!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  password!: string;
}
