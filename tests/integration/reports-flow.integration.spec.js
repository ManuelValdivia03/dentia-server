const { request } = require('./helpers/http');
const {
  loginAsAdmin,
  loginAsDentist,
  loginAsPatient,
} = require('./helpers/auth');

describe('Dentia reports real integration flow', () => {
  let adminToken;
  let dentistToken;
  let patientToken;

  beforeAll(async () => {
    adminToken = (await loginAsAdmin()).token;
    dentistToken = (await loginAsDentist()).token;
    patientToken = (await loginAsPatient()).token;
  });

  it('debe impedir reportes a pacientes', async () => {
    const res = await request('/reports/dashboard/summary', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('debe entregar el resumen del dentista dentro de su alcance', async () => {
    const res = await request('/reports/dashboard/summary', {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.total_appointments).toBe('number');
    expect(typeof res.body.completion_rate).toBe('number');
  });

  it('debe impedir que un dentista consulte otro alcance', async () => {
    const res = await request('/reports/dashboard/summary?doctor_id=d-other', {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('debe permitir al administrador consultar el resumen global', async () => {
    const res = await request('/reports/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_appointments');
  });

  it('debe devolver citas agrupadas por estado', async () => {
    const res = await request(
      '/reports/appointments/by-status?doctor_id=d-it-dentist-001',
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('debe exportar CSV con encabezados correctos', async () => {
    const res = await request('/reports/export/appointments-by-status', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.text.trim().split(/\r?\n/)[0]).toBe('status,total');
  });
});
