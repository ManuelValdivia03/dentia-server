import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const VALID_ROLES = ['ADMIN', 'DENTIST', 'PATIENT'];

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const expectedApiKey = process.env.INTERNAL_API_KEY;
    const providedApiKey = request.headers['x-internal-api-key'];

    if (expectedApiKey && providedApiKey !== expectedApiKey) {
      throw new ForbiddenException('Invalid internal API key');
    }

    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    if (!userId || !userRole) {
      throw new UnauthorizedException('Missing user context');
    }

    if (!VALID_ROLES.includes(userRole)) {
      throw new ForbiddenException('Invalid user role');
    }

    return true;
  }
}