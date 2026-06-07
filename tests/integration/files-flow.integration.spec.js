const { request, expectStatus } = require('./helpers/http');
const {
  loginAsDentist,
  loginAsPatient,
  loginAsSecondPatient,
} = require('./helpers/auth');
const { extractArray, extractId } = require('./helpers/resources');

describe('Dentia files real integration flow', () => {
  let patientToken;
  let secondPatientToken;
  let dentistToken;
  let fileId;

  beforeAll(async () => {
    patientToken = (await loginAsPatient()).token;
    secondPatientToken = (await loginAsSecondPatient()).token;
    dentistToken = (await loginAsDentist()).token;
  });

  it('debe rechazar un tipo de archivo no permitido', async () => {
    const form = new FormData();
    form.append(
      'file',
      new Blob(['contenido no permitido'], { type: 'text/plain' }),
      'nota.txt',
    );

    const res = await request('/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: form,
    });
    expectStatus(res, [400, 415]);
  });

  it('debe subir un archivo clinico como paciente para si mismo', async () => {
    const form = new FormData();
    form.append('patientId', 'p-it-patient-002');
    form.append(
      'file',
      new Blob(['%PDF-1.4 integration'], { type: 'application/pdf' }),
      'historial.pdf',
    );

    const res = await request('/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: form,
    });

    expectStatus(res, [200, 201]);
    fileId = extractId(res.body);
    expect(fileId).toBeTruthy();
    expect(res.body.patientId).toBe('p-it-patient-001');
  });

  it('debe listar el archivo para su paciente propietario', async () => {
    const res = await request('/files', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status).toBe(200);
    expect(
      extractArray(res.body).some((item) => extractId(item) === fileId),
    ).toBe(true);
  });

  it('debe permitir consultar y descargar el archivo', async () => {
    const metadata = await request(`/files/${fileId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(metadata.status).toBe(200);
    expect(metadata.body.originalName).toBe('historial.pdf');

    const download = await request(`/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(download.status).toBe(200);
    expect(download.headers.get('content-type')).toContain('application/pdf');
    expect(download.text).toContain('%PDF-1.4');
  });

  it('debe impedir acceso a otro paciente', async () => {
    const res = await request(`/files/${fileId}`, {
      headers: { Authorization: `Bearer ${secondPatientToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('debe permitir acceso al dentista con relacion clinica', async () => {
    const res = await request('/files?patientId=p-it-patient-001', {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(res.status).toBe(200);
    expect(
      extractArray(res.body).some((item) => extractId(item) === fileId),
    ).toBe(true);
  });

  it('debe exigir patientId al dentista al listar', async () => {
    const res = await request('/files', {
      headers: { Authorization: `Bearer ${dentistToken}` },
    });
    expect(res.status).toBe(400);
  });

  it('debe eliminar el archivo y dejar de encontrarlo', async () => {
    const removed = await request(`/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expectStatus(removed, [200, 204]);

    const missing = await request(`/files/${fileId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(missing.status).toBe(404);
  });
});
