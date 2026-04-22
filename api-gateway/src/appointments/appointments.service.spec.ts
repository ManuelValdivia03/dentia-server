import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AppointmentsService } from './appointments.service';
import { UserRole } from '../auth/enums/user-role.enum';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const clientProxyMock = {
    send: jest.fn(),
  };

  const requester = {
    sub: 'user-1',
    role: UserRole.PATIENT,
    domainId: 'p1',
    email: 'patient1@dentia.local',
  };

  beforeEach(async () => {
    clientProxyMock.send.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: 'APPOINTMENTS_SERVICE',
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll debe enviar el comando correcto', async () => {
    const expected = [{ id: 'a1' }];
    clientProxyMock.send.mockReturnValueOnce(of(expected));

    const result = await service.findAll(requester as any);

    expect(clientProxyMock.send).toHaveBeenCalledWith(
      { cmd: 'appointments.findAll' },
      { requester },
    );
    expect(result).toEqual(expected);
  });

  it('findOne debe enviar el comando correcto', async () => {
    const expected = { id: 'a1' };
    clientProxyMock.send.mockReturnValueOnce(of(expected));

    const result = await service.findOne('a1', requester as any);

    expect(clientProxyMock.send).toHaveBeenCalledWith(
      { cmd: 'appointments.findOne' },
      { id: 'a1', requester },
    );
    expect(result).toEqual(expected);
  });

  it('create debe enviar el comando correcto', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
      reason: 'Limpieza',
    };
    const expected = { id: 'a1', ...dto };

    clientProxyMock.send.mockReturnValueOnce(of(expected));

    const result = await service.create(dto as any, requester as any);

    expect(clientProxyMock.send).toHaveBeenCalledWith(
      { cmd: 'appointments.create' },
      { dto, requester },
    );
    expect(result).toEqual(expected);
  });
});