/// <reference types="jest" />

import { StreamableFile, UnauthorizedException } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { UserRole } from '../auth/enums/user-role.enum';

describe('PrescriptionsController', () => {
  let controller: PrescriptionsController;
  let service: jest.Mocked<PrescriptionsService>;

  const authorization = 'Bearer test-token';

  const dentistUser: any = {
    sub: 'u-dentist',
    role: UserRole.DENTIST,
    domainId: 'd1',
    email: 'dentist1@dentia.local',
  };

  const patientUser: any = {
    sub: 'u-patient',
    role: UserRole.PATIENT,
    domainId: 'p1',
    email: 'patient1@dentia.local',
  };

  const adminUser: any = {
    sub: 'u-admin',
    role: UserRole.ADMIN,
    domainId: 'admin1',
    email: 'admin@dentia.local',
  };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findOne: jest.fn(),
      generatePdf: jest.fn(),
      findByAppointment: jest.fn(),
    } as any;

    controller = new PrescriptionsController(service);
  });

  it('create debe delegar dto, user y Authorization header', async () => {
    const dto: any = {
      appointmentId: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      diagnosis: 'Gingivitis leve',
      indications: 'Cepillado tres veces al dia',
      notes: 'Control en una semana',
    };

    const req: any = {
      headers: { authorization },
      user: dentistUser,
    };

    const prescription = {
      id: 'rx-1',
      ...dto,
      status: 'ACTIVE',
    };

    service.create.mockResolvedValueOnce(prescription as any);

    const result = await controller.create(dto, req);

    expect(service.create).toHaveBeenCalledWith(dto, dentistUser, authorization);
    expect(result).toEqual(prescription);
  });

  it('create debe lanzar UnauthorizedException si falta Authorization header', () => {
    const dto: any = {
      appointmentId: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      diagnosis: 'Dx',
      indications: 'Indicaciones',
    };

    const req: any = {
      headers: {},
      user: dentistUser,
    };

    expect(() => controller.create(dto, req)).toThrow(UnauthorizedException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('findOne debe delegar id y user', async () => {
    const req: any = {
      headers: { authorization },
      user: patientUser,
    };

    const prescription = {
      id: 'rx-1',
      appointmentId: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      status: 'ACTIVE',
    };

    service.findOne.mockResolvedValueOnce(prescription as any);

    const result = await controller.findOne('rx-1', req);

    expect(service.findOne).toHaveBeenCalledWith('rx-1', patientUser);
    expect(result).toEqual(prescription);
  });

  it('generatePdf debe devolver StreamableFile con PDF generado', async () => {
    const req: any = {
      headers: { authorization },
      user: adminUser,
    };

    const pdfBuffer = Buffer.from('%PDF fake content');

    service.generatePdf.mockResolvedValueOnce({
      filename: 'receta-rx-1.pdf',
      contentType: 'application/pdf',
      base64: pdfBuffer.toString('base64'),
    } as any);

    const result = await controller.generatePdf('rx-1', req);

    expect(service.generatePdf).toHaveBeenCalledWith('rx-1', adminUser);
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('findByAppointment debe delegar appointmentId y user', async () => {
    const req: any = {
      headers: { authorization },
      user: patientUser,
    };

    const prescriptions = [
      {
        id: 'rx-1',
        appointmentId: 'a1',
        patientId: 'p1',
        dentistId: 'd1',
        status: 'ACTIVE',
      },
    ];

    service.findByAppointment.mockResolvedValueOnce(prescriptions as any);

    const result = await controller.findByAppointment('a1', req);

    expect(service.findByAppointment).toHaveBeenCalledWith('a1', patientUser);
    expect(result).toEqual(prescriptions);
  });
});