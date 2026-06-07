const { request } = require('./helpers/http');
const { extractAccessToken, loginAsPatient } = require('./helpers/auth');

function cookiePair(setCookie) {
  return setCookie?.split(';', 1)[0] || null;
}

describe('Dentia real authentication session flow', () => {
  it('debe emitir, rotar y revocar la cookie de sesion', async () => {
    const login = await loginAsPatient();
    expect(login.res.status).toBe(200);

    const firstCookie = cookiePair(login.res.headers.get('set-cookie'));
    expect(firstCookie).toMatch(/^dentia_refresh_token=/);

    const refreshed = await request('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: firstCookie },
      body: JSON.stringify({}),
    });
    expect(refreshed.status).toBe(200);
    expect(extractAccessToken(refreshed.body)).toBeTruthy();

    const secondCookie = cookiePair(refreshed.headers.get('set-cookie'));
    expect(secondCookie).toMatch(/^dentia_refresh_token=/);
    expect(secondCookie).not.toBe(firstCookie);

    const reused = await request('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: firstCookie },
      body: JSON.stringify({}),
    });
    expect(reused.status).toBe(401);

    const logout = await request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: secondCookie },
      body: JSON.stringify({}),
    });
    expect(logout.status).toBe(200);

    const afterLogout = await request('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: secondCookie },
      body: JSON.stringify({}),
    });
    expect(afterLogout.status).toBe(401);
  });

  it('debe rechazar refresh sin cookie', async () => {
    const res = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it('debe permitir logout idempotente sin cookie', async () => {
    const res = await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });
});
