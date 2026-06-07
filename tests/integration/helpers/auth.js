const { request } = require('./http');

function extractAccessToken(body) {
  return (
    body?.accessToken ||
    body?.access_token ||
    body?.token ||
    body?.data?.accessToken ||
    body?.data?.access_token ||
    null
  );
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const token = extractAccessToken(res.body);

  if (!token) {
    throw new Error(
      `Login failed for ${email}. Status: ${res.status}. Body: ${JSON.stringify(res.body)}`,
    );
  }

  return {
    res,
    token,
  };
}

async function loginAsPatient() {
  return login('patient.it@dentia.local', 'Password123!');
}

async function loginAsSecondPatient() {
  return login('patient2.it@dentia.local', 'Password123!');
}

async function loginAsDentist() {
  return login('dentist.it@dentia.local', 'Password123!');
}

module.exports = {
  extractAccessToken,
  loginAsPatient,
  loginAsSecondPatient,
  loginAsDentist,
};