const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'integration_test_secret_at_least_32_chars';

function createTestToken({
  sub,
  domainId,
  email,
  role,
}) {
  return jwt.sign(
    {
      sub,
      domainId,
      email,
      role,
    },
    JWT_SECRET,
    {
      expiresIn: '1h',
    },
  );
}

function createPatientToken(overrides = {}) {
  return createTestToken({
    sub: overrides.sub || '11111111-1111-1111-1111-111111111111',
    domainId: overrides.domainId || 'p-it-patient-001',
    email: overrides.email || 'patient.it@dentia.local',
    role: overrides.role || 'PATIENT',
  });
}

function createSecondPatientToken(overrides = {}) {
  return createTestToken({
    sub: overrides.sub || '22222222-2222-2222-2222-222222222222',
    domainId: overrides.domainId || 'p-it-patient-002',
    email: overrides.email || 'patient2.it@dentia.local',
    role: overrides.role || 'PATIENT',
  });
}

function createDentistToken(overrides = {}) {
  return createTestToken({
    sub: overrides.sub || '33333333-3333-3333-3333-333333333333',
    domainId: overrides.domainId || 'd-it-dentist-001',
    email: overrides.email || 'dentist.it@dentia.local',
    role: overrides.role || 'DENTIST',
  });
}

module.exports = {
  createTestToken,
  createPatientToken,
  createSecondPatientToken,
  createDentistToken,
};
