const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5439),
    user: process.env.POSTGRES_USER || 'dentia_test',
    password: process.env.POSTGRES_PASSWORD || 'dentia_test',
    database: process.env.APPOINTMENTS_POSTGRES_DB || 'dentia_appointments_test',
  });

  await client.connect();

  await client.query('DELETE FROM "appointment_ratings";');
  await client.query(`
    DELETE FROM appointments
    WHERE id NOT IN (
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-8444-444444444444'
    );
  `);

  await client.query(`
    INSERT INTO appointments (
      id,
      "patientId",
      "dentistId",
      "startAt",
      "endAt",
      status,
      reason,
      notes,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      '44444444-4444-4444-4444-444444444444',
      'p-it-patient-001',
      'd-it-dentist-001',
      '2026-06-01 10:00:00',
      '2026-06-01 11:00:00',
      'COMPLETED'::appointments_status_enum,
      'Cita completada para receta IT',
      'Seed de integración',
      now(),
      now()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      "patientId" = EXCLUDED."patientId",
      "dentistId" = EXCLUDED."dentistId",
      "startAt" = EXCLUDED."startAt",
      "endAt" = EXCLUDED."endAt",
      status = EXCLUDED.status,
      reason = EXCLUDED.reason,
      notes = EXCLUDED.notes,
      "updatedAt" = now();

    INSERT INTO appointments (
      id,
      "patientId",
      "dentistId",
      "startAt",
      "endAt",
      status,
      reason,
      notes,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      '44444444-4444-4444-8444-444444444444',
      'p-it-patient-001',
      'd-it-dentist-001',
      '2026-06-01 12:00:00',
      '2026-06-01 13:00:00',
      'COMPLETED'::appointments_status_enum,
      'Cita completada para expediente clínico IT',
      'Seed de integración expediente clínico',
      now(),
      now()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      "patientId" = EXCLUDED."patientId",
      "dentistId" = EXCLUDED."dentistId",
      "startAt" = EXCLUDED."startAt",
      "endAt" = EXCLUDED."endAt",
      status = EXCLUDED.status,
      reason = EXCLUDED.reason,
      notes = EXCLUDED.notes,
      "updatedAt" = now();
  `);

  await client.end();

  console.log('Integration appointments seed completed');
}

main().catch((error) => {
  console.error('Integration appointments seed failed');
  console.error(error);
  process.exit(1);
});
