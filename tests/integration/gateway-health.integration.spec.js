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

describe('Dentia integration health checks', () => {
  it('API Gateway debe estar saludable', async () => {
    const res = await request('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('api-gateway');
  });

  it('todas las dependencias del Gateway deben estar saludables', async () => {
    const res = await request('/health');

    expect(res.status).toBe(200);

    const dependencies = res.body.checks.dependencies;

    expect(dependencies.authService.status).toBe('ok');
    expect(dependencies.appointmentsService.status).toBe('ok');
    expect(dependencies.prescriptionsService.status).toBe('ok');
    expect(dependencies.chatService.status).toBe('ok');
    expect(dependencies.filesService.status).toBe('ok');
    expect(dependencies.reportsService.status).toBe('ok');
  });
});