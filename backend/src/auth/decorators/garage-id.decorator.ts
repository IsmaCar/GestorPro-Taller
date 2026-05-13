import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GarageId = createParamDecorator((ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user: { garageId: string } }>();
  return request.user.garageId;
});
