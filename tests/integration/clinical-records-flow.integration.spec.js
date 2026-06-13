const { execFileSync } = require('child_process');
const { request, expectStatus } = require('./helpers/http');
const {
  loginAsPatient,
  loginAsSecondPatient,
  loginAsDentist,
} = require('./helpers/auth');

describe('Dentia clinical records real integration flow', () => {
  const appointmentId = '44444444-4444-4444-8444-444444444444';
  const patientId = 'p-it-patient-001';
  const secondPatientId = 'p-it-patient-002';
  const patientWithoutRelationId = 'p-it-patient-no-relation';

  let patientToken;
  let secondPatientToken;
  let dentistToken;
  let encounterId;

  beforeAll(async () => {
    cleanClinicalRecords();

    const patientLogin = await loginAsPatient();
    const secondPatientLogin = await loginAsSecondPatient();
    const dentistLogin = await loginAsDentist();

    expect(patientLogin.res.status).toBe(200);
    expect(secondPatientLogin.res.status).toBe(200);
    expect(dentistLogin.res.status).toBe(200);

    patientToken = patientLogin.token;
    secondPatientToken = secondPatientLogin.token;
    dentistToken = dentistLogin.token;

    expect(patientToken).toBeTruthy();
    expect(secondPatientToken).toBeTruthy();
    expect(dentistToken).toBeTruthy();
  });

  it('debe consultar expediente de paciente con relación clínica como dentista', async () => {
    const res = await request(`/clinical-records/patients/${patientId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
    expect(res.body.patientId).toBe(patientId);
    expect(Array.isArray(res.body.encounters)).toBe(true);
  });

  it('debe actualizar antecedentes médicos como dentista', async () => {
    const res = await request(`/clinical-records/patients/${patientId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
      body: JSON.stringify({
        bloodType: 'O+',
        allergies: 'Penicilina',
        chronicDiseases: 'Ninguna',
        currentMedications: 'Ibuprofeno ocasional',
        surgicalHistory: 'Sin cirugías relevantes',
        familyHistory: 'Diabetes en familiares directos',
        dentalHistory: 'Ortodoncia previa',
        riskNotes: 'Paciente ansioso durante consulta',
      }),
    });

    expect(res.status).toBe(200);
    expect(res.body.patientId).toBe(patientId);
    expect(res.body.bloodType).toBe('O+');
    expect(res.body.allergies).toBe('Penicilina');
  });

  it('debe registrar una consulta clínica como dentista', async () => {
    const res = await request(
      `/clinical-records/patients/${patientId}/encounters`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dentistToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          reasonForVisit: 'Dolor en molar inferior derecho',
          arrivalDescription:
            'Paciente llega con dolor agudo y sensibilidad al frío',
          symptoms: 'Dolor, inflamación leve, molestia al masticar',
          diagnosis: 'Caries profunda en molar inferior derecho',
          treatmentPerformed:
            'Limpieza de zona afectada y restauración provisional',
          treatmentPlan: 'Endodoncia en próxima cita',
          observations: 'Se recomienda evitar alimentos duros',
          fileIds: [],
        }),
      },
    );

    expectStatus(res, [200, 201]);
    expect(res.body).toBeTruthy();
    expect(res.body.id).toBeTruthy();
    expect(res.body.patientId).toBe(patientId);
    expect(res.body.appointmentId).toBe(appointmentId);
    expect(res.body.diagnosis).toBe('Caries profunda en molar inferior derecho');

    encounterId = res.body.id;
  });

  it('debe consultar expediente con consultas clínicas registradas', async () => {
    expect(encounterId).toBeTruthy();

    const res = await request(`/clinical-records/patients/${patientId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dentistToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.patientId).toBe(patientId);
    expect(res.body.bloodType).toBe('O+');
    expect(Array.isArray(res.body.encounters)).toBe(true);
    expect(res.body.encounters.length).toBeGreaterThanOrEqual(1);

    const encounter = res.body.encounters.find((item) => item.id === encounterId);

    expect(encounter).toBeTruthy();
    expect(encounter.reasonForVisit).toBe('Dolor en molar inferior derecho');
    expect(encounter.diagnosis).toBe('Caries profunda en molar inferior derecho');
  });

  it('debe permitir al paciente consultar su propio expediente', async () => {
    const res = await request('/clinical-records/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
    expect(res.body.patientId).toBe(patientId);
    expect(Array.isArray(res.body.encounters)).toBe(true);
  });

  it('debe rechazar que un paciente consulte expediente ajeno por ruta de dentista', async () => {
    const res = await request(`/clinical-records/patients/${patientId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secondPatientToken}`,
      },
    });

    expectStatus(res, [403]);
  });

  it('debe rechazar dentista sin relación clínica con el paciente', async () => {
    const res = await request(
      `/clinical-records/patients/${patientWithoutRelationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${dentistToken}`,
        },
      },
    );

    expectStatus(res, [403]);
  });

  it('debe impedir duplicar consulta clínica para la misma cita', async () => {
    const res = await request(
      `/clinical-records/patients/${patientId}/encounters`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dentistToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          reasonForVisit: 'Consulta duplicada',
          diagnosis: 'No debe permitir duplicado',
        }),
      },
    );

    expectStatus(res, [400, 409]);
  });

  it('debe rechazar registrar consulta clínica si la cita no pertenece al paciente', async () => {
    const res = await request(
      `/clinical-records/patients/${secondPatientId}/encounters`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dentistToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          reasonForVisit: 'Paciente incorrecto',
          diagnosis: 'La cita no corresponde al paciente indicado',
        }),
      },
    );

    expectStatus(res, [400, 403]);
  });
});

function cleanClinicalRecords() {
  const containerName = process.env.POSTGRES_CONTAINER ?? 'dentia-postgres';
  const dbUser = process.env.POSTGRES_USER ?? 'dentia';
  const dbName = process.env.PRESCRIPTIONS_DB_NAME ?? 'dentia_prescriptions';

  const sql = `
    DELETE FROM clinical_encounters
    WHERE patient_id IN ('p-it-patient-001', 'p-it-patient-002', 'p-it-patient-no-relation')
       OR appointment_id = '44444444-4444-4444-8444-444444444444';

    DELETE FROM clinical_records
    WHERE patient_id IN ('p-it-patient-001', 'p-it-patient-002', 'p-it-patient-no-relation');
  `;

  execFileSync(
    'docker',
    [
      'exec',
      containerName,
      'psql',
      '-U',
      dbUser,
      '-d',
      dbName,
      '-c',
      sql,
    ],
    {
      stdio: 'pipe',
    },
  );
}