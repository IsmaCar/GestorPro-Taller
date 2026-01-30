import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @IsNotEmpty()
  @IsString()
  InvitationToken: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
