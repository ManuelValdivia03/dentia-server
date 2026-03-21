import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  login(body: any) {
    return {
      message: 'auth-service login ok',
      body,
    };
  }
}