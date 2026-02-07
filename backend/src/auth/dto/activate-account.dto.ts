import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @IsNotEmpty()
  @IsString()
  invitationToken: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
