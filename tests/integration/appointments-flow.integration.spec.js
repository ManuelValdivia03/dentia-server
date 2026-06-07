const { request, expectStatus } = require('./helpers/http');
const {
  loginAsPatient,
  loginAsSecondPatient,
  loginAsDentist,
} = require('./helpers/auth');
const {
  extractAppointmentId,
  extractList,
} = require('./helpers/extract');
const { futureUtcDay } = require('./helpers/dates');

describe('Dentia appointments real integration flow', () => {
  const dentistId = 'd-it-dentist-001';
  const { startAt, endAt } = futureUtcDay(60, 15);

  let patientToken;
  let secondPatientToken;
  let dentistToken;
  let appointmentId;
  let secondAppointmentId;

  beforeAll(async () => {
    const patientLogin = await loginAsPatient();
    const secondPatientLogin = await loginAsSecondPatient();
    const dentistLogin = await loginAsDentist();

    expect(patientLogin.res.status).toBe(200);
    expect(secondPatientLogin.res.status).toBe(200);
    expect(dentistLogin.res.status).toBe(200);

    patientToken = patientLogin.token;
    secondPatientToken = secondPatientLogin.token;
    dentistToken = dentistLogin.token;

    expect(patientToken).toBeTruthy();
    expect(secondPatientToken).toBeTruthy();
    expect(dentistToken).toBeTruthy();
  });

  it('debe crear una cita como paciente con JWT real', async () => {
    const res = await request('/appointments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        dentistId,
        startAt,
        endAt,
      }),
    });

    expectStatus(res, [200, 201]);

    appointmentId = extractAppointmentId(res.body);

    expect(appointmentId).toBeTruthy();
  });

  it('debe listar citas del paciente autenticado', async () => {
    const res = await request('/appointments', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
    });

    expect(res.status).toBe(200);

    const appointments = extractList(res.body);

    expect(Array.isArray(appointments)).toBe(true);
  });

  it('debe permitir múltiples solicitudes pendientes para el mismo dentista y horario', async () => {
    const res = await request('/appointments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secondPatientToken}`,
      },
      body: JSON.stringify({
        dentistId,
        startAt,
        endAt,
      }),
    });

    expectStatus(res, [200, 201]);

    secondAppointmentId = extractAppointmentId(res.body);

    expect(secondAppointmentId).toBeTruthy();
  });

  it('debe permitir al dentista consultar sus citas', async () => {
    const res = await request('/appointments', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expect(res.status).toBe(200);

    const appointments = extractList(res.body);

    expect(Array.isArray(appointments)).toBe(true);
  });

  it('debe bloquear confirmación de segunda cita si ya existe una confirmada en el mismo horario', async () => {
    expect(appointmentId).toBeTruthy();
    expect(secondAppointmentId).toBeTruthy();

    const confirmOriginal = await request(`/appointments/${appointmentId}/confirm`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expectStatus(confirmOriginal, [200, 204]);

    const confirmSecond = await request(`/appointments/${secondAppointmentId}/confirm`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expectStatus(confirmSecond, [400, 409]);
  });

  it('debe rechazar crear nueva solicitud si ya existe una cita confirmada en el mismo horario', async () => {
    const res = await request('/appointments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secondPatientToken}`,
      },
      body: JSON.stringify({
        dentistId,
        startAt,
        endAt,
      }),
    });

    expectStatus(res, [400, 409]);
  });

  it('debe cancelar la solicitud pendiente del segundo paciente', async () => {
    expect(secondAppointmentId).toBeTruthy();

    const res = await request(`/appointments/${secondAppointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${secondPatientToken}`,
      },
    });

    expectStatus(res, [200, 204]);
  });

  it('debe cancelar la cita original como paciente dueño', async () => {
    expect(appointmentId).toBeTruthy();

    const res = await request(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
    });

    expectStatus(res, [200, 204]);
  });

  it('debe rechazar cancelar una cita cancelada o ajena con otro paciente', async () => {
    expect(appointmentId).toBeTruthy();

    const res = await request(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${secondPatientToken}`,
      },
    });

    expectStatus(res, [400, 403, 404, 409]);
  });
});
