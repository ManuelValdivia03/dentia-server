/// <reference types="jest" />

import { StreamableFile, UnauthorizedException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: jest.Mocked<ReportsService>;

  const authorization = 'Bearer test-token';

  beforeEach(() => {
    service = {
      getDashboardSummary: jest.fn(),
      getAppointmentsByStatus: jest.fn(),
      exportAppointmentsByStatus: jest.fn(),
    } as any;

    controller = new ReportsController(service);
  });

  it('getDashboardSummary debe delegar Authorization y doctorId', async () => {
    const summary = {
      total_appointments: 10,
      scheduled: 2,
      confirmed: 1,
      completed: 5,
      cancelled: 1,
      no_show: 1,
      completion_rate: 50,
    };

    service.getDashboardSummary.mockResolvedValueOnce(summary as any);

    const result = await controller.getDashboardSummary(authorization, 'd1');

    expect(service.getDashboardSummary).toHaveBeenCalledWith(
      authorization,
      'd1',
    );
    expect(result).toEqual(summary);
  });

  it('getDashboardSummary debe lanzar UnauthorizedException sin Authorization', () => {
    expect(() => controller.getDashboardSummary('', 'd1')).toThrow(
      UnauthorizedException,
    );

    expect(service.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('getAppointmentsByStatus debe delegar Authorization y doctorId', async () => {
    const report = {
      data: [
        { status: 'completed', total: 5 },
        { status: 'cancelled', total: 2 },
      ],
    };

    service.getAppointmentsByStatus.mockResolvedValueOnce(report as any);

    const result = await controller.getAppointmentsByStatus(authorization, 'd1');

    expect(service.getAppointmentsByStatus).toHaveBeenCalledWith(
      authorization,
      'd1',
    );
    expect(result).toEqual(report);
  });

  it('getAppointmentsByStatus debe lanzar UnauthorizedException sin Authorization', () => {
    expect(() => controller.getAppointmentsByStatus('', undefined)).toThrow(
      UnauthorizedException,
    );

    expect(service.getAppointmentsByStatus).not.toHaveBeenCalled();
  });

  it('exportAppointmentsByStatus debe configurar headers y devolver StreamableFile', async () => {
    const res = {
      setHeader: jest.fn(),
    };

    service.exportAppointmentsByStatus.mockResolvedValueOnce({
      buffer: Buffer.from('status,total\ncompleted,5\n'),
      headers: {
        'content-disposition':
          'attachment; filename="appointments-by-status-d1.csv"',
      },
    } as any);

    const result = await controller.exportAppointmentsByStatus(
      authorization,
      'd1',
      res as any,
    );

    expect(service.exportAppointmentsByStatus).toHaveBeenCalledWith(
      authorization,
      'd1',
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="appointments-by-status-d1.csv"',
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('exportAppointmentsByStatus debe usar filename default si no viene content-disposition', async () => {
    const res = {
      setHeader: jest.fn(),
    };

    service.exportAppointmentsByStatus.mockResolvedValueOnce({
      buffer: Buffer.from('status,total\ncompleted,5\n'),
      headers: {},
    } as any);

    const result = await controller.exportAppointmentsByStatus(
      authorization,
      undefined,
      res as any,
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="appointments-by-status.csv"',
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('exportAppointmentsByStatus debe lanzar UnauthorizedException sin Authorization', async () => {
    const res = {
      setHeader: jest.fn(),
    };

    await expect(
      controller.exportAppointmentsByStatus('', undefined, res as any),
    ).rejects.toThrow(UnauthorizedException);

    expect(service.exportAppointmentsByStatus).not.toHaveBeenCalled();
  });
});