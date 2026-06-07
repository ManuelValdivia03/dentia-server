const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3100';

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';

  let body = null;
  let text = '';

  try {
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      text = await response.text();
    }
  } catch {
    body = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
    text,
    headers: response.headers,
  };
}

function expectStatus(res, allowedStatuses) {
  expect(allowedStatuses).toContain(res.status);
}

function uniqueEmail(prefix = 'it') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@dentia.local`;
}

module.exports = {
  BASE_URL,
  request,
  expectStatus,
  uniqueEmail,
};