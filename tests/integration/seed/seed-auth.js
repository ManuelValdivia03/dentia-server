const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const PASSWORD = 'Password123!';

const users = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin.it@dentia.local',
    role: 'ADMIN',
    domainId: 'a-it-admin-001',
    fullName: 'Administrador Integracion',
  },
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'patient.it@dentia.local',
    role: 'PATIENT',
    domainId: 'p-it-patient-001',
    fullName: 'Paciente Integración',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'patient2.it@dentia.local',
    role: 'PATIENT',
    domainId: 'p-it-patient-002',
    fullName: 'Paciente Integración Dos',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'dentist.it@dentia.local',
    role: 'DENTIST',
    domainId: 'd-it-dentist-001',
    fullName: 'Dentista Integración',
    specialty: 'Ortodoncia',
    cedulaProfesional: 'CED-IT-001',
    escuela: 'Universidad IT',
    descripcion: 'Dentista de pruebas de integración',
  },
];

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5439),
    user: process.env.POSTGRES_USER || 'dentia_test',
    password: process.env.POSTGRES_PASSWORD || 'dentia_test',
    database: process.env.POSTGRES_DB || 'dentia_auth_test',
  });

  await client.connect();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const user of users) {
    await client.query(
      `
      INSERT INTO users (
        id,
        email,
        "passwordHash",
        role,
        "domainId",
        "fullName",
        specialty,
        "cedulaProfesional",
        escuela,
        descripcion,
        "isActive",
        "emailVerified",
        "failedLoginAttempts",
        "emailVerificationAttempts",
        "passwordResetAttempts",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4::users_role_enum, $5, $6, $7, $8, $9, $10,
        true, true, 0, 0, 0, now(), now()
      )
      ON CONFLICT (email)
      DO UPDATE SET
        "passwordHash" = EXCLUDED."passwordHash",
        role = EXCLUDED.role,
        "domainId" = EXCLUDED."domainId",
        "fullName" = EXCLUDED."fullName",
        specialty = EXCLUDED.specialty,
        "cedulaProfesional" = EXCLUDED."cedulaProfesional",
        escuela = EXCLUDED.escuela,
        descripcion = EXCLUDED.descripcion,
        "isActive" = true,
        "emailVerified" = true,
        "updatedAt" = now();
      `,
      [
        user.id,
        user.email,
        passwordHash,
        user.role,
        user.domainId,
        user.fullName,
        user.specialty || null,
        user.cedulaProfesional || null,
        user.escuela || null,
        user.descripcion || null,
      ],
    );
  }

  await client.end();

  console.log('Integration auth seed completed');
}

main().catch((error) => {
  console.error('Integration auth seed failed');
  console.error(error);
  process.exit(1);
});
