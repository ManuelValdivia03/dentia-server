import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface UserSummary {
  id?: string;
  domainId: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  specialty?: string;
  cedulaProfesional?: string;
  professionalLicense?: string;
  escuela?: string;
  descripcion?: string;
}

@Injectable()
export class UsersClient {
  private readonly authServiceUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://auth-service:3001';

  async findUserByDomainId(
    domainId: string,
    authHeader?: string,
  ): Promise<UserSummary> {
    return this.get<UserSummary>(`/users/${domainId}`, authHeader);
  }

  async findDentistByDomainId(
    domainId: string,
    authHeader?: string,
  ): Promise<UserSummary> {
    return this.get<UserSummary>(`/dentists/${domainId}`, authHeader);
  }

  private async get<T>(path: string, authHeader?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(`${this.authServiceUrl}${path}`, {
      method: 'GET',
      headers,
    }).catch(() => {
      throw new ServiceUnavailableException('auth-service is unavailable');
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (response.status === 404) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!response.ok) {
      throw new HttpException(
        data?.message ?? data?.title ?? 'No se pudo consultar el usuario',
        response.status,
      );
    }

    return data as T;
  }
}