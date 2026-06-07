const { request, expectStatus } = require('./helpers/http');

describe('Dentia integration reports security', () => {
  it('debe rechazar dashboard sin JWT', async () => {
    const res = await request('/reports/dashboard/summary', {
      method: 'GET',
    });

    expectStatus(res, [401, 403]);
  });

  it('debe rechazar reporte de citas por estado sin JWT', async () => {
    const res = await request('/reports/appointments/by-status', {
      method: 'GET',
    });

    expectStatus(res, [401, 403]);
  });

  it('debe rechazar exportación de citas por estado sin JWT', async () => {
    const res = await request('/reports/export/appointments-by-status', {
      method: 'GET',
    });

    expectStatus(res, [401, 403]);
  });
});