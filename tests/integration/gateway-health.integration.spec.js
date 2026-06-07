const { request } = require('./helpers/http');

describe('Dentia integration health checks', () => {
  it('API Gateway debe responder healthy', async () => {
    const res = await request('/health');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('api-gateway');
  });

  it('la configuración del Gateway debe estar completa', async () => {
    const res = await request('/health');

    expect(res.status).toBe(200);
    expect(res.body.checks.configuration.status).toBe('ok');
    expect(res.body.checks.configuration.missing).toEqual([]);
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

  it('cada dependencia debe responder con statusCode 200 desde el Gateway', async () => {
    const res = await request('/health');

    expect(res.status).toBe(200);

    const dependencies = Object.values(res.body.checks.dependencies);

    for (const dependency of dependencies) {
      expect(dependency.statusCode).toBe(200);
    }
  });
});