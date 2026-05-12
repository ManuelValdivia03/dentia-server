import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.interface';

export const CurrentUserParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest();

    return {
      id: request.headers['x-user-id'],
      role: request.headers['x-user-role'],
    };
  },
);