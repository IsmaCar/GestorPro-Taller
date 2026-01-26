import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginOwnerDto } from './dto/login-owner.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(201)
  @Post('register-tenant')
  register(@Body() registerTenantDto: RegisterTenantDto) {
    return this.authService.registerTenant(registerTenantDto);
  }

  @Post('login-owner')
  loginOwner(@Body() loginOwnerDto: LoginOwnerDto) {
    return this.authService.loginOwner(loginOwnerDto);
  }
}
