const { request, expectStatus } = require('./helpers/http');
const {
  loginAsPatient,
  loginAsSecondPatient,
  loginAsDentist,
} = require('./helpers/auth');
const { extractPrescriptionId } = require('./helpers/prescriptions');

describe('Dentia prescriptions real integration flow', () => {
  const appointmentId = '44444444-4444-4444-4444-444444444444';
  const patientId = 'p-it-patient-001';
  const secondPatientId = 'p-it-patient-002';
  const dentistId = 'd-it-dentist-001';

  let patientToken;
  let secondPatientToken;
  let dentistToken;
  let prescriptionId;

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

  it('debe crear una receta como dentista para una cita completada seeded', async () => {
    const res = await request('/prescriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
      body: JSON.stringify({
        appointmentId,
        patientId,
        dentistId,
        diagnosis: 'Gingivitis leve',
        indications: 'Cepillado tres veces al día y uso de hilo dental.',
        notes: 'Control en una semana.',
      }),
    });

    expectStatus(res, [200, 201]);

    prescriptionId = extractPrescriptionId(res.body);

    expect(prescriptionId).toBeTruthy();
  });

  it('debe impedir crear una receta duplicada ACTIVE para la misma cita', async () => {
    const res = await request('/prescriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
      body: JSON.stringify({
        appointmentId,
        patientId,
        dentistId,
        diagnosis: 'Gingivitis leve',
        indications: 'Indicaciones duplicadas',
        notes: 'No debe permitir duplicado.',
      }),
    });

    expectStatus(res, [400, 409]);
  });

  it('debe consultar la receta por id como dentista', async () => {
    expect(prescriptionId).toBeTruthy();

    const res = await request(`/prescriptions/${prescriptionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
    expect(res.body.id || res.body.data?.id).toBeTruthy();
  });

  it('debe consultar la receta por id como paciente dueño', async () => {
    expect(prescriptionId).toBeTruthy();

    const res = await request(`/prescriptions/${prescriptionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
  });

  it('debe rechazar consultar la receta con paciente ajeno', async () => {
    expect(prescriptionId).toBeTruthy();

    const res = await request(`/prescriptions/${prescriptionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secondPatientToken}`,
      },
    });

    expectStatus(res, [403, 404, 503]);
  });

  it('debe consultar recetas por cita como dentista', async () => {
    const res = await request(`/appointments/${appointmentId}/prescriptions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('debe generar o descargar PDF de receta', async () => {
    expect(prescriptionId).toBeTruthy();

    const res = await request(`/prescriptions/${prescriptionId}/pdf`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expect(res.status).toBe(200);
  });

  it('debe rechazar crear receta como paciente', async () => {
    const res = await request('/prescriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        appointmentId,
        patientId,
        dentistId,
        diagnosis: 'No autorizado',
        indications: 'No debe permitirse',
        notes: 'Paciente no puede crear receta.',
      }),
    });

    expectStatus(res, [403]);
  });

  it('debe rechazar receta si el patientId no coincide con la cita', async () => {
    const res = await request('/prescriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
      body: JSON.stringify({
        appointmentId,
        patientId: secondPatientId,
        dentistId,
        diagnosis: 'Paciente incorrecto',
        indications: 'No debe permitirse',
        notes: 'patientId no coincide con la cita.',
      }),
    });

    expectStatus(res, [400, 403]);
  });
});