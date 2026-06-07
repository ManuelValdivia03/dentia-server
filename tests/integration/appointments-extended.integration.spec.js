const { request, expectStatus } = require('./helpers/http');
const {
  loginAsDentist,
  loginAsPatient,
  loginAsSecondPatient,
} = require('./helpers/auth');
const { extractAppointmentId, extractList } = require('./helpers/extract');
const { futureUtcDay } = require('./helpers/dates');

describe('Dentia appointments extended integration flow', () => {
  const dentistId = 'd-it-dentist-001';
  const original = futureUtcDay(90, 12);
  const rescheduledSlot = futureUtcDay(90, 13);
  const foreignReschedule = futureUtcDay(90, 14);
  let patientToken;
  let secondPatientToken;
  let dentistToken;
  let appointmentId;

  beforeAll(async () => {
    patientToken = (await loginAsPatient()).token;
    secondPatientToken = (await loginAsSecondPatient()).token;
    dentistToken = (await loginAsDentist()).token;
  });

  it('debe validar rangos y fechas requeridas', async () => {
    const invalidRange = await request('/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        dentistId,
        startAt: original.endAt,
        endAt: original.startAt,
      }),
    });
    expect(invalidRange.status).toBe(400);

    const invalidAvailability = await request(
      `/appointments/availability?dentistId=${dentistId}&date=invalid`,
      { headers: { Authorization: `Bearer ${patientToken}` } },
    );
    expect(invalidAvailability.status).toBe(400);
  });

  it('debe consultar ocho espacios de disponibilidad laboral', async () => {
    const res = await request(
      `/appointments/availability?dentistId=${dentistId}&date=${original.date}`,
      { headers: { Authorization: `Bearer ${patientToken}` } },
    );
    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(8);
  });

  it('debe crear, consultar y reprogramar una cita propia', async () => {
    const created = await request('/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        dentistId,
        startAt: original.startAt,
        endAt: original.endAt,
        reason: 'Revision de integracion',
      }),
    });
    expectStatus(created, [200, 201]);
    appointmentId = extractAppointmentId(created.body);
    expect(appointmentId).toBeTruthy();

    const detail = await request(`/appointments/${appointmentId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(detail.status).toBe(200);
    expect(detail.body.patientId).toBe('p-it-patient-001');

    const rescheduleResponse = await request(
      `/appointments/${appointmentId}/reschedule`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${patientToken}` },
        body: JSON.stringify({
          startAt: rescheduledSlot.startAt,
          endAt: rescheduledSlot.endAt,
        }),
      },
    );
    expect(rescheduleResponse.status).toBe(200);
  });

  it('debe impedir consultar o reprogramar una cita ajena', async () => {
    const detail = await request(`/appointments/${appointmentId}`, {
      headers: { Authorization: `Bearer ${secondPatientToken}` },
    });
    expect(detail.status).toBe(403);

    const reschedule = await request(
      `/appointments/${appointmentId}/reschedule`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${secondPatientToken}` },
        body: JSON.stringify({
          startAt: foreignReschedule.startAt,
          endAt: foreignReschedule.endAt,
        }),
      },
    );
    expect(reschedule.status).toBe(403);
  });

  it('debe impedir confirmar a un paciente', async () => {
    const res = await request(`/appointments/${appointmentId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('debe mostrar agenda diaria al dentista y bloquearla al paciente', async () => {
    const dentist = await request(`/appointments/day?date=${original.date}`, {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(dentist.status).toBe(200);
    expect(
      extractList(dentist.body).some((item) => item.id === appointmentId),
    ).toBe(true);

    const patient = await request(`/appointments/day?date=${original.date}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(patient.status).toBe(403);
  });

  it('debe confirmar la cita y reflejar el horario como ocupado', async () => {
    const confirmed = await request(`/appointments/${appointmentId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(confirmed.status).toBe(200);

    const availability = await request(
      `/appointments/availability?dentistId=${dentistId}&date=${original.date}`,
      { headers: { Authorization: `Bearer ${patientToken}` } },
    );
    expect(availability.status).toBe(200);
    expect(
      availability.body.slots.some((slot) => slot.available === false),
    ).toBe(true);
  });

  it('debe impedir completar una cita futura', async () => {
    const res = await request(`/appointments/${appointmentId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(res.status).toBe(400);
  });
});
