import { Injectable } from '@nestjs/common';

@Injectable()
export class AppointmentsService {
  create(body: any) {
    return {
      message: 'appointment created',
      body,
    };
  }

  findAll() {
    return [
      { id: '1', date: '2026-03-21', patientId: 'p1', dentistId: 'd1' },
      { id: '2', date: '2026-03-22', patientId: 'p2', dentistId: 'd1' },
    ];
  }

  findOne(id: string) {
    return { id, date: '2026-03-21', patientId: 'p1', dentistId: 'd1' };
  }
}