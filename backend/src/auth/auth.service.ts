import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole } from 'generated/prisma';
import { LoginOwnerDto } from './dto/login-owner.dto';
import { JwtService } from '@nestjs/jwt';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserInvitationDto } from './dto/create-user-invitation.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';

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

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('El usuario no existe');

    if (user.passwordHash === null)
      throw new UnauthorizedException('La contraseña no existe o no ha sido creada');

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const hashPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword },
    });

    return { message: 'Contraseña actualizada con éxito' };
  }

  async createUserInvitation(ownerId: string, createUserInvitationDto: CreateUserInvitationDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) throw new NotFoundException('Usuario no encontrado');

    if (owner.rol !== UserRole.OWNER)
      throw new UnauthorizedException('Solo el dueño puede crear usuarios');

    if (createUserInvitationDto.rol === UserRole.OWNER)
      throw new ConflictException('No se puede crear otro usuario "Dueño"');

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: createUserInvitationDto.email,
        garageId: owner.garageId,
      },
    });

    if (existingUser)
      throw new ConflictException('Ya existe un empleado con ese email en el taller');

    const invitationToken = await bcrypt.hash(`${createUserInvitationDto.email}-${Date.now()}`, 10);

    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7);

    const user = await this.prisma.user.create({
      data: {
        name: createUserInvitationDto.name,
        email: createUserInvitationDto.email,
        rol: createUserInvitationDto.rol,
        garageId: owner.garageId,
        invitationToken,
        invitationExpiresAt,
        emailVerified: false,
        passwordHash: null,
      },
    });

    return {
      message: 'Invitación enviada exitosamente',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
      },
      invitationToken, //SOLO DESARROLLO/TESTING, ELIMINAR EN PRODUCCIÓN
    };
  }

  async activateAccount(activateAccountDto: ActivateAccountDto) {
    const user = await this.prisma.user.findFirst({
      where: { invitationToken: activateAccountDto.InvitationToken },
    });

    if (!user) throw new NotFoundException('El usuario no ha sido invitado');

    if (!user.invitationExpiresAt || user.invitationExpiresAt < new Date())
      throw new UnauthorizedException('La invitación expiró o no existe');

    if (user.passwordHash !== null)
      throw new ConflictException('El usuario ya ha creado la contraseña');

    const hashPassword = await bcrypt.hash(activateAccountDto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword, emailVerified: true, invitationToken: null },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      garageId: user.garageId,
      rol: user.rol,
    };

    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}
