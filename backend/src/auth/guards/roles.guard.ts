import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Leer roles requeridos del decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Obtener el usuario del request (viene de JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // 3. Verificar si el usuario tiene alguno de los roles requeridos
    return requiredRoles.some((role) => user.rol === role);
  }
}
