const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5439),
    user: process.env.POSTGRES_USER || 'dentia_test',
    password: process.env.POSTGRES_PASSWORD || 'dentia_test',
    database: process.env.PRESCRIPTIONS_POSTGRES_DB || 'dentia_prescriptions_test',
  });

  await client.connect();

  await client.query('TRUNCATE TABLE prescriptions RESTART IDENTITY CASCADE;');

  await client.end();

  console.log('Integration prescriptions cleanup completed');
}

main().catch((error) => {
  console.error('Integration prescriptions cleanup failed');
  console.error(error);
  process.exit(1);
});