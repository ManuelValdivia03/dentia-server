/// <reference types="jest" />

import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { RequestUserRole } from './interfaces/request-user.interface';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: jest.Mocked<AppointmentsService>;

  const requester = {
    sub: 'u1',
    role: RequestUserRole.PATIENT,
    domainId: 'p1',
    email: 'patient1@dentia.local',
  };

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getAvailability: jest.fn(),
      create: jest.fn(),
      reschedule: jest.fn(),
      cancel: jest.fn(),
      confirm: jest.fn(),
      complete: jest.fn(),
    } as any;

    controller = new AppointmentsController(service);
  });

  it('findAll debe delegar requester al service', async () => {
    const expected = [{ id: 'a1' }];
    service.findAll.mockResolvedValueOnce(expected as any);

    const result = await controller.findAll({ requester } as any);

    expect(service.findAll).toHaveBeenCalledWith(requester);
    expect(result).toEqual(expected);
  });

  it('findOne debe delegar id y requester al service', async () => {
    const expected = { id: 'a1' };
    service.findOne.mockResolvedValueOnce(expected as any);

    const result = await controller.findOne({
      id: 'a1',
      requester,
    } as any);

    expect(service.findOne).toHaveBeenCalledWith('a1', requester);
    expect(result).toEqual(expected);
  });

  it('getAvailability debe delegar payload al service', async () => {
    const expected = { dentistId: 'd1', date: '2026-04-21', slots: [] };
    service.getAvailability.mockResolvedValueOnce(expected as any);

    const result = await controller.getAvailability({
      dentistId: 'd1',
      date: '2026-04-21',
      requester,
    } as any);

    expect(service.getAvailability).toHaveBeenCalledWith(
      'd1',
      '2026-04-21',
      requester,
    );
    expect(result).toEqual(expected);
  });

  it('create debe delegar dto y requester al service', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
    };

    service.create.mockResolvedValueOnce({ id: 'a1', ...dto } as any);

    const result = await controller.create({
      dto,
      requester,
    } as any);

    expect(service.create).toHaveBeenCalledWith(dto, requester);
    expect(result).toEqual({ id: 'a1', ...dto });
  });

  it('reschedule debe delegar id, dto y requester al service', async () => {
    const dto = {
      startAt: '2026-04-22T12:00:00.000Z',
      endAt: '2026-04-22T13:00:00.000Z',
    };

    service.reschedule.mockResolvedValueOnce({ id: 'a1', ...dto } as any);

    const result = await controller.reschedule({
      id: 'a1',
      dto,
      requester,
    } as any);

    expect(service.reschedule).toHaveBeenCalledWith('a1', dto, requester);
    expect(result).toEqual({ id: 'a1', ...dto });
  });

  it('cancel debe delegar id y requester al service', async () => {
    service.cancel.mockResolvedValueOnce({
      id: 'a1',
      status: 'CANCELLED',
    } as any);

    const result = await controller.cancel({
      id: 'a1',
      requester,
    } as any);

    expect(service.cancel).toHaveBeenCalledWith('a1', requester);
    expect(result).toEqual({
      id: 'a1',
      status: 'CANCELLED',
    });
  });

  it('confirm debe delegar id y requester al service', async () => {
    const dentistRequester = {
      ...requester,
      role: RequestUserRole.DENTIST,
      domainId: 'd1',
      email: 'dentist1@dentia.local',
    };

    service.confirm.mockResolvedValueOnce({
      id: 'a1',
      status: 'CONFIRMED',
    } as any);

    const result = await controller.confirm({
      id: 'a1',
      requester: dentistRequester,
    } as any);

    expect(service.confirm).toHaveBeenCalledWith('a1', dentistRequester);
    expect(result).toEqual({
      id: 'a1',
      status: 'CONFIRMED',
    });
  });

  it('complete debe delegar id y requester al service', async () => {
    const dentistRequester = {
      ...requester,
      role: RequestUserRole.DENTIST,
      domainId: 'd1',
      email: 'dentist1@dentia.local',
    };

    service.complete.mockResolvedValueOnce({
      id: 'a1',
      status: 'COMPLETED',
    } as any);

    const result = await controller.complete({
      id: 'a1',
      requester: dentistRequester,
    } as any);

    expect(service.complete).toHaveBeenCalledWith('a1', dentistRequester);
    expect(result).toEqual({
      id: 'a1',
      status: 'COMPLETED',
    });
  });
});