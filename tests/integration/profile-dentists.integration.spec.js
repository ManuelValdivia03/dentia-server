const { request } = require('./helpers/http');
const { loginAsDentist, loginAsPatient } = require('./helpers/auth');
const { extractArray } = require('./helpers/resources');

describe('Dentia profile and dentists integration flow', () => {
  let patientToken;
  let dentistToken;

  beforeAll(async () => {
    patientToken = (await loginAsPatient()).token;
    dentistToken = (await loginAsDentist()).token;
  });

  it('debe devolver el perfil autenticado sin datos sensibles', async () => {
    const res = await request('/profile', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('patient.it@dentia.local');
    expect(res.body.domainId).toBe('p-it-patient-001');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('debe actualizar campos permitidos del perfil', async () => {
    const form = new FormData();
    form.append('fullName', 'Paciente Integracion Actualizado');

    const res = await request('/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: form,
    });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('Paciente Integracion Actualizado');
  });

  it('debe rechazar una actualizacion de perfil invalida', async () => {
    const form = new FormData();
    form.append('fullName', '12');

    const res = await request('/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: form,
    });

    expect(res.status).toBe(400);
  });

  it('debe listar y consultar dentistas publicamente', async () => {
    const list = await request('/dentists');
    expect(list.status).toBe(200);
    expect(
      extractArray(list.body).some(
        (item) => item.domainId === 'd-it-dentist-001',
      ),
    ).toBe(true);

    const detail = await request('/dentists/d-it-dentist-001');
    expect(detail.status).toBe(200);
    expect(detail.body.domainId).toBe('d-it-dentist-001');
    expect(detail.body.specialty).toBe('Ortodoncia');
  });

  it('debe devolver 404 para un dentista inexistente', async () => {
    const res = await request('/dentists/d-does-not-exist');
    expect(res.status).toBe(404);
  });

  it('debe priorizar dentistas previamente visitados para el paciente', async () => {
    const res = await request('/dentists/prioritized', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });

    expect(res.status).toBe(200);
    const seeded = extractArray(res.body).find(
      (item) => item.domainId === 'd-it-dentist-001',
    );
    expect(seeded?.previouslyVisited).toBe(true);
  });

  it('debe impedir la vista priorizada a dentistas', async () => {
    const res = await request('/dentists/prioritized', {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(res.status).toBe(403);
  });
});
