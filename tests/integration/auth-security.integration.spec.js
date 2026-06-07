const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3100';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    status: response.status,
    body,
  };
}

describe('Dentia integration security checks', () => {
  it('debe rechazar login con credenciales incorrectas', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'fake.it@dentia.local',
        password: 'WrongPassword123!',
      }),
    });

    expect([400, 401]).toContain(res.status);
  });

  it('debe rechazar acceso a perfil sin JWT', async () => {
    const res = await request('/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar crear cita sin JWT', async () => {
    const res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        dentistId: 'test-dentist-id',
        startAt: '2026-06-10T15:00:00.000Z',
        endAt: '2026-06-10T16:00:00.000Z',
      }),
    });

    expect(res.status).toBe(401);
  });
});