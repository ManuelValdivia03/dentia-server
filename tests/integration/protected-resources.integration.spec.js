const { request, expectStatus } = require('./helpers/http');

describe('Dentia integration protected resources', () => {
  it('debe rechazar listar citas sin JWT', async () => {
    const res = await request('/appointments', {
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

  it('debe rechazar cancelar cita sin JWT', async () => {
    const res = await request('/appointments/test-id/cancel', {
      method: 'PATCH',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar confirmar cita sin JWT', async () => {
    const res = await request('/appointments/test-id/confirm', {
      method: 'PATCH',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar completar cita sin JWT', async () => {
    const res = await request('/appointments/test-id/complete', {
      method: 'PATCH',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar crear valoración sin JWT', async () => {
    const res = await request('/appointments/test-id/rating', {
      method: 'POST',
      body: JSON.stringify({
        rating: 5,
        comment: 'Excelente atención',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar crear receta sin JWT', async () => {
    const res = await request('/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        appointmentId: 'test-appointment-id',
        diagnosis: 'Diagnóstico de prueba',
        indications: 'Indicaciones de prueba',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar consultar receta sin JWT', async () => {
    const res = await request('/prescriptions/test-id', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar descargar PDF de receta sin JWT', async () => {
    const res = await request('/prescriptions/test-id/pdf', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar listar archivos sin JWT', async () => {
    const res = await request('/files', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar consultar archivo sin JWT', async () => {
    const res = await request('/files/test-id', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar descargar archivo sin JWT', async () => {
    const res = await request('/files/test-id/download', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar eliminar archivo sin JWT', async () => {
    const res = await request('/files/test-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar listar conversaciones sin JWT', async () => {
    const res = await request('/chat/conversations', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar crear conversación sin JWT', async () => {
    const res = await request('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({
        dentistId: 'test-dentist-id',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar listar mensajes sin JWT', async () => {
    const res = await request('/chat/conversations/test-conversation-id/messages', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar enviar mensaje sin JWT', async () => {
    const res = await request('/chat/conversations/test-conversation-id/messages', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Mensaje de prueba',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('debe rechazar marcar conversación como leída sin JWT', async () => {
    const res = await request('/chat/conversations/test-conversation-id/read', {
      method: 'PATCH',
    });

    expect(res.status).toBe(401);
  });

  it('debe proteger reportes sin JWT', async () => {
    const res = await request('/reports/dashboard/summary', {
      method: 'GET',
    });

    expectStatus(res, [401, 403]);
  });

  it('debe proteger exportación de reportes sin JWT', async () => {
    const res = await request('/reports/export/appointments-by-status', {
      method: 'GET',
    });

    expectStatus(res, [401, 403]);
  });
});