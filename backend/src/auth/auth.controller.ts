import { Controller, Post, Body, HttpCode, UseGuards, Patch, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginOwnerDto } from './dto/login-owner.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserId } from './decorators/user-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(201)
  @Post('register-tenant')
  register(@Body() registerTenantDto: RegisterTenantDto) {
    return this.authService.registerTenant(registerTenantDto);
  }

  @HttpCode(200)
  @Post('login-owner')
  loginOwner(@Body() loginOwnerDto: LoginOwnerDto) {
    return this.authService.loginOwner(loginOwnerDto);
  }

  @Patch('password/change')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @UserId() userId: string,
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }
}
