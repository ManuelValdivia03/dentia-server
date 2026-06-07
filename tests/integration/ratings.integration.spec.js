const { request, expectStatus } = require('./helpers/http');
const {
  loginAsDentist,
  loginAsPatient,
  loginAsSecondPatient,
} = require('./helpers/auth');

describe('Dentia ratings real integration flow', () => {
  const appointmentId = '44444444-4444-4444-4444-444444444444';
  const dentistId = 'd-it-dentist-001';
  let patientToken;
  let secondPatientToken;
  let dentistToken;

  beforeAll(async () => {
    patientToken = (await loginAsPatient()).token;
    secondPatientToken = (await loginAsSecondPatient()).token;
    dentistToken = (await loginAsDentist()).token;
  });

  it('debe rechazar una puntuacion fuera de rango', async () => {
    const res = await request(`/appointments/${appointmentId}/rating`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ score: 6, comment: 'Invalida' }),
    });
    expect(res.status).toBe(400);
  });

  it('debe impedir valorar una cita ajena', async () => {
    const res = await request(`/appointments/${appointmentId}/rating`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secondPatientToken}` },
      body: JSON.stringify({ score: 5, comment: 'No corresponde' }),
    });
    expect(res.status).toBe(403);
  });

  it('debe registrar la valoracion del paciente propietario', async () => {
    const res = await request(`/appointments/${appointmentId}/rating`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ score: 5, comment: 'Excelente atencion' }),
    });
    expectStatus(res, [200, 201]);
    expect(res.body.score).toBe(5);
  });

  it('debe impedir valorar dos veces la misma cita', async () => {
    const res = await request(`/appointments/${appointmentId}/rating`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ score: 4 }),
    });
    expect(res.status).toBe(409);
  });

  it('debe reflejar la valoracion en el resumen del dentista', async () => {
    const res = await request(`/dentists/${dentistId}/ratings/summary`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.body.totalRatings).toBeGreaterThanOrEqual(1);
    expect(Number(res.body.averageScore)).toBeGreaterThan(0);
  });

  it('debe permitir al dentista consultar solo su propio resumen', async () => {
    const own = await request(`/dentists/${dentistId}/ratings/summary`, {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(own.status).toBe(200);

    const other = await request('/dentists/d-other/ratings/summary', {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(other.status).toBe(403);
  });
});
