import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  currentPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  newPassword: string;
}
