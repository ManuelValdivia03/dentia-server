import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppointmentsService {
  constructor(private readonly http: HttpService) {}

  async create(body: any) {
    const response = await firstValueFrom(
      this.http.post('http://localhost:3002/appointments', body),
    );
    return response.data;
  }

  async findAll() {
    const response = await firstValueFrom(
      this.http.get('http://localhost:3002/appointments'),
    );
    return response.data;
  }

  async findOne(id: string) {
    const response = await firstValueFrom(
      this.http.get(`http://localhost:3002/appointments/${id}`),
    );
    return response.data;
  }
}