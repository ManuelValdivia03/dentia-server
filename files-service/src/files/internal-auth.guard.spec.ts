import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';

describe('InternalAuthGuard', () => {
  let guard: InternalAuthGuard;

  function createContext(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    guard = new InternalAuthGuard();
    process.env.INTERNAL_API_KEY = 'dev-internal-key';
  });

  it('allows valid internal request with user context', () => {
    const context = createContext({
      'x-internal-api-key': 'dev-internal-key',
      'x-user-id': 'p1',
      'x-user-role': 'PATIENT',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects invalid internal api key', () => {
    const context = createContext({
      'x-internal-api-key': 'bad-key',
      'x-user-id': 'p1',
      'x-user-role': 'PATIENT',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects missing user context', () => {
    const context = createContext({
      'x-internal-api-key': 'dev-internal-key',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects invalid role', () => {
    const context = createContext({
      'x-internal-api-key': 'dev-internal-key',
      'x-user-id': 'p1',
      'x-user-role': 'SUPERUSER',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});