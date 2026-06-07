const { request, expectStatus, uniqueEmail } = require('./helpers/http');

describe('Dentia integration auth and security checks', () => {
  it('debe rechazar login sin body válido', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expectStatus(res, [400, 401]);
  });

  it('debe rechazar login con credenciales incorrectas', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'fake.it@dentia.local',
        password: 'WrongPassword123!',
      }),
    });

    expectStatus(res, [400, 401]);
  });

  it('debe rechazar registro con email inválido', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'correo-invalido',
        password: 'Password123!',
        name: 'Paciente IT',
        role: 'patient',
      }),
    });

    expect(res.status).toBe(400);
  });

  it('debe rechazar registro con password débil', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail('weak-password'),
        password: '123',
        name: 'Paciente IT',
        role: 'patient',
      }),
    });

    expectStatus(res, [400, 422]);
  });

  it('debe rechazar acceso a perfil sin JWT', async () => {
    const res = await request('/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar JWT inválido', async () => {
    const res = await request('/profile', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-invalido',
      },
    });

    expectStatus(res, [401, 403]);
  });
});