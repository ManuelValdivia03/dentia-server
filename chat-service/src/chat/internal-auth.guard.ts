import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !userRole) {
      throw new UnauthorizedException('Missing authenticated user headers');
    }

    if (!['PATIENT', 'DENTIST', 'ADMIN'].includes(userRole)) {
      throw new UnauthorizedException('Invalid user role');
    }

    return true;
  }
}