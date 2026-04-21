import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createContext = (user?: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);
  });

  it('debe permitir acceso si el endpoint no requiere roles', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);

    const context = createContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe lanzar 401 si requiere roles pero no hay user', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([UserRole.PATIENT]);

    const context = createContext();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('debe lanzar 403 si el rol no coincide', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([UserRole.ADMIN]);

    const context = createContext({
      role: UserRole.PATIENT,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe permitir acceso si el rol coincide', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([
      UserRole.ADMIN,
      UserRole.DENTIST,
    ]);

    const context = createContext({
      role: UserRole.DENTIST,
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});