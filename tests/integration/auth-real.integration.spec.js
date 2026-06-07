const {
  loginAsPatient,
  loginAsSecondPatient,
  loginAsDentist,
} = require('./helpers/auth');

describe('Dentia real auth integration flow', () => {
  it('debe iniciar sesión como paciente seeded', async () => {
    const { res, token } = await loginAsPatient();

    expect(res.status).toBe(200);
    expect(token).toBeTruthy();
  });

  it('debe iniciar sesión como segundo paciente seeded', async () => {
    const { res, token } = await loginAsSecondPatient();

    expect(res.status).toBe(200);
    expect(token).toBeTruthy();
  });

  it('debe iniciar sesión como dentista seeded', async () => {
    const { res, token } = await loginAsDentist();

    expect(res.status).toBe(200);
    expect(token).toBeTruthy();
  });
});