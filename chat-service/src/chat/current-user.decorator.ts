import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUser = {
  id: string;
  role: 'PATIENT' | 'DENTIST' | 'ADMIN';
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const req = ctx.switchToHttp().getRequest();

    return {
      id: req.headers['x-user-id'],
      role: req.headers['x-user-role'],
    };
  },
);