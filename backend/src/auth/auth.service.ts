import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole } from 'generated/prisma';
import { LoginOwnerDto } from './dto/login-owner.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registerTenant(registerTenantDto: RegisterTenantDto) {
    try {
      const passwordHash = await bcrypt.hash(registerTenantDto.password, 10);

      const result = await this.prisma.$transaction(async (prisma) => {
        //Crear tenant (Garage)
        const garage = await prisma.garage.create({
          data: {
            name: registerTenantDto.garageName,
            fiscalId: registerTenantDto.fiscalId,
          },
        });

        //Crear Admin (Dueño)
        const user = await prisma.user.create({
          data: {
            name: registerTenantDto.adminName,
            email: registerTenantDto.adminEmail,
            passwordHash: passwordHash,
            rol: UserRole.OWNER,
            garageId: garage.id,
          },
        });

        //Actualizar el campo userId en garage con el user creado
        await prisma.garage.update({
          where: { id: garage.id },
          data: { adminUserId: user.id },
        });

        return {
          garage,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            rol: user.rol,
          },
        };
      });
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('fiscalId')) {
            throw new ConflictException('El NIF ya está registrado');
          }
          if (target?.includes('email')) {
            throw new ConflictException('El email ya está registrado');
          }
          throw new ConflictException('Ya existe un registro con estos datos');
        }
      }
      throw error;
    }
  }

  async loginOwner(loginOwnerDto: LoginOwnerDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: loginOwnerDto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginOwnerDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      garageId: user.garageId,
      rol: user.rol,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        garageId: user.garageId,
      },
    };
  }
}
