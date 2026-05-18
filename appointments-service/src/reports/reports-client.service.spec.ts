import { ReportsClientService } from './reports-client.service';

describe('ReportsClientService', () => {
  let service: ReportsClientService;

  beforeEach(() => {
    service = new ReportsClientService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should send appointment snapshot to reports-service', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => '',
    } as Response);

    await service.sendAppointmentSnapshot({
      appointment_id: 'apt_001',
      doctor_id: 'd1',
      patient_id: 'p1',
      status: 'scheduled',
      scheduled_at: '2026-05-15T10:00:00.000Z',
      duration_minutes: 60,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/reports/snapshots/appointments'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-internal-api-key': expect.any(String),
        }),
      }),
    );
  });

  it('should not throw if reports-service is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(
      service.sendAppointmentSnapshot({
        appointment_id: 'apt_001',
        doctor_id: 'd1',
        patient_id: 'p1',
        status: 'scheduled',
        scheduled_at: '2026-05-15T10:00:00.000Z',
        duration_minutes: 60,
      }),
    ).resolves.not.toThrow();
  });
});