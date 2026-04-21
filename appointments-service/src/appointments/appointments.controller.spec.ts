import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: jest.Mocked<AppointmentsService>;

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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll debe delegar al service', async () => {
    const expected = [{ id: 'a1' }];
    service.findAll.mockResolvedValueOnce(expected as any);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('findOne debe delegar al service con id', async () => {
    const expected = { id: 'a1' };
    service.findOne.mockResolvedValueOnce(expected as any);

    const result = await controller.findOne('a1');

    expect(service.findOne).toHaveBeenCalledWith('a1');
    expect(result).toEqual(expected);
  });

  it('getAvailability debe delegar payload al service', async () => {
    const expected = { dentistId: 'd1', date: '2026-04-21', slots: [] };
    service.getAvailability.mockResolvedValueOnce(expected as any);

    const result = await controller.getAvailability({
      dentistId: 'd1',
      date: '2026-04-21',
    });

    expect(service.getAvailability).toHaveBeenCalledWith('d1', '2026-04-21');
    expect(result).toEqual(expected);
  });

  it('create debe delegar dto al service', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
    };

    service.create.mockResolvedValueOnce({ id: 'a1', ...dto } as any);

    const result = await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'a1', ...dto });
  });

  it('reschedule debe delegar id y dto al service', async () => {
    const dto = {
      startAt: '2026-04-22T12:00:00.000Z',
      endAt: '2026-04-22T13:00:00.000Z',
    };

    service.reschedule.mockResolvedValueOnce({ id: 'a1', ...dto } as any);

    const result = await controller.reschedule({
      id: 'a1',
      dto: dto as any,
    });

    expect(service.reschedule).toHaveBeenCalledWith('a1', dto);
    expect(result).toEqual({ id: 'a1', ...dto });
  });

  it('cancel debe delegar id al service', async () => {
    service.cancel.mockResolvedValueOnce({
      id: 'a1',
      status: 'CANCELLED',
    } as any);

    const result = await controller.cancel('a1');

    expect(service.cancel).toHaveBeenCalledWith('a1');
    expect(result).toEqual({
      id: 'a1',
      status: 'CANCELLED',
    });
  });

  it('confirm debe delegar id al service', async () => {
    service.confirm.mockResolvedValueOnce({
      id: 'a1',
      status: 'CONFIRMED',
    } as any);

    const result = await controller.confirm('a1');

    expect(service.confirm).toHaveBeenCalledWith('a1');
    expect(result).toEqual({
      id: 'a1',
      status: 'CONFIRMED',
    });
  });

  it('complete debe delegar id al service', async () => {
    service.complete.mockResolvedValueOnce({
      id: 'a1',
      status: 'COMPLETED',
    } as any);

    const result = await controller.complete('a1');

    expect(service.complete).toHaveBeenCalledWith('a1');
    expect(result).toEqual({
      id: 'a1',
      status: 'COMPLETED',
    });
  });
});