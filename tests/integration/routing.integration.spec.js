const { request } = require('./helpers/http');

describe('Dentia integration routing checks', () => {
  it('debe devolver 404 en ruta inexistente', async () => {
    const res = await request('/ruta-que-no-existe', {
      method: 'GET',
    });

    expect(res.status).toBe(404);
  });

  it('debe devolver 404 en recurso inexistente bajo módulo conocido sin JWT o recurso inválido', async () => {
    const res = await request('/unknown-module/test', {
      method: 'GET',
    });

    expect(res.status).toBe(404);
  });

  it('debe exponer health del Gateway', async () => {
    const res = await request('/health', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    expect(res.body.service).toBe('api-gateway');
  });
});