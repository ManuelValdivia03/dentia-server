const { request, expectStatus } = require('./helpers/http');
const {
  loginAsDentist,
  loginAsPatient,
  loginAsSecondPatient,
} = require('./helpers/auth');
const { extractArray, extractId } = require('./helpers/resources');

describe('Dentia chat real integration flow', () => {
  const patientId = 'p-it-patient-001';
  const dentistId = 'd-it-dentist-001';
  let patientToken;
  let secondPatientToken;
  let dentistToken;
  let conversationId;

  beforeAll(async () => {
    patientToken = (await loginAsPatient()).token;
    secondPatientToken = (await loginAsSecondPatient()).token;
    dentistToken = (await loginAsDentist()).token;
  });

  it('debe impedir abrir una conversacion sin relacion clinica', async () => {
    const res = await request('/chat/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secondPatientToken}` },
      body: JSON.stringify({
        patientId: 'p-it-patient-002',
        dentistId,
      }),
    });
    expect(res.status).toBe(403);
  });

  it('debe crear una conversacion para usuarios relacionados', async () => {
    const res = await request('/chat/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ patientId, dentistId }),
    });
    expectStatus(res, [200, 201]);
    conversationId = extractId(res.body);
    expect(conversationId).toBeTruthy();
  });

  it('debe reutilizar la conversacion existente para la misma pareja', async () => {
    const res = await request('/chat/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dentistToken}` },
      body: JSON.stringify({ patientId, dentistId }),
    });
    expectStatus(res, [200, 201]);
    expect(extractId(res.body)).toBe(conversationId);
  });

  it('debe listar la conversacion para ambos participantes', async () => {
    for (const token of [patientToken, dentistToken]) {
      const res = await request('/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expect(
        extractArray(res.body).some(
          (item) => extractId(item) === conversationId,
        ),
      ).toBe(true);
    }
  });

  it('debe rechazar mensajes vacios', async () => {
    const res = await request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ body: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('debe intercambiar y listar mensajes', async () => {
    const sent = await request(
      `/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${patientToken}` },
        body: JSON.stringify({
          body: 'Hola doctor, mensaje de integracion.',
        }),
      },
    );
    expectStatus(sent, [200, 201]);
    expect(sent.body.body).toContain('Hola doctor');

    const reply = await request(
      `/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${dentistToken}` },
        body: JSON.stringify({ body: 'Mensaje recibido.' }),
      },
    );
    expectStatus(reply, [200, 201]);

    const listed = await request(
      `/chat/conversations/${conversationId}/messages?limit=10`,
      { headers: { Authorization: `Bearer ${patientToken}` } },
    );
    expect(listed.status).toBe(200);
    expect(extractArray(listed.body).length).toBeGreaterThanOrEqual(2);
  });

  it('debe impedir acceso a un paciente ajeno', async () => {
    const res = await request(`/chat/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${secondPatientToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('debe marcar la conversacion como leida', async () => {
    const res = await request(`/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
