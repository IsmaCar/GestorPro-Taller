import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  // 1. Inyectamos el Reflector para poder leer los metadatos
  canActivate(context: ExecutionContext): boolean {
    // 2. Leer roles requeridos del decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 3. Si la ruta no tiene el decorador @Roles, cualquiera puede pasar
    if (!requiredRoles) {
      return true;
    }
    // 4. Obtener el usuario del request (viene de JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // 5. Verificar si el usuario tiene alguno de los roles requeridos
    return requiredRoles.some((role) => user.rol === role);
  }
}
