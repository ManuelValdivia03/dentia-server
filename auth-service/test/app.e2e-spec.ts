import { ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RefreshSession } from '../src/auth/entities/refresh-session.entity';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../src/auth/rate-limit.guard';
import { MailService } from '../src/mail/mail.service';
import { User } from '../src/users/entities/user.entity';

type StoredEntity = {
  id?: string;
  [key: string]: any;
};

class InMemoryRepository<T extends StoredEntity> {
  private readonly rows: T[] = [];

  async count() {
    return this.rows.length;
  }

  create(data: Partial<T>) {
    return data as T;
  }

  async save(entity: T) {
    if (!entity.id) {
      entity.id = randomUUID();
    }

    const index = this.rows.findIndex((row) => row.id === entity.id);

    if (index >= 0) {
      this.rows[index] = entity;
    } else {
      this.rows.push(entity);
    }

    return entity;
  }

  async findOne(options: { where: Partial<T> }) {
    return (
      this.rows.find((row) => this.matchesWhere(row, options.where)) ?? null
    );
  }

  async find(options: {
    where?: Partial<T>;
    order?: Record<string, 'ASC' | 'DESC'>;
  }) {
    const where = options.where ?? {};
    const order = options.order ?? {};
    const rows = this.rows.filter((row) => this.matchesWhere(row, where));

    return rows.sort((left, right) => {
      for (const [key, direction] of Object.entries(order)) {
        const leftValue = left[key];
        const rightValue = right[key];

        if (leftValue === rightValue) {
          continue;
        }

        const result = String(leftValue ?? '').localeCompare(
          String(rightValue ?? ''),
        );
        return direction === 'ASC' ? result : -result;
      }

      return 0;
    });
  }

  async update(where: Partial<T>, partial: Partial<T>) {
    let affected = 0;

    for (const row of this.rows) {
      if (this.matchesWhere(row, where)) {
        Object.assign(row, partial);
        affected += 1;
      }
    }

    return { affected };
  }

  private matchesWhere(row: T, where: Partial<T>) {
    return Object.entries(where).every(([key, expected]) => {
      const actual = row[key];

      if (
        expected &&
        typeof expected === 'object' &&
        !(expected instanceof Date) &&
        !Buffer.isBuffer(expected)
      ) {
        return actual === null || actual === undefined;
      }

      return actual === expected;
    });
  }
}

describe('Auth flows (e2e)', () => {
  let app: any;
  let verificationCodes: Map<string, string>;
  let passwordResetCodes: Map<string, string>;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'dentia-e2e-secret';
    process.env.ACCESS_TOKEN_TTL = '2m';
    process.env.REFRESH_TOKEN_IDLE_TIMEOUT_SECONDS = '1';
    process.env.REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS = '60';
    process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = '0';
    process.env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = '0';

    verificationCodes = new Map();
    passwordResetCodes = new Map();

    const mailService = {
      sendVerificationCode: jest.fn(async (to: string, code: string) => {
        verificationCodes.set(to, code);
      }),
      sendPasswordResetCode: jest.fn(async (to: string, code: string) => {
        passwordResetCodes.set(to, code);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: process.env.ACCESS_TOKEN_TTL as any },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        RateLimitGuard,
        {
          provide: getRepositoryToken(User),
          useValue: new InMemoryRepository<User>(),
        },
        {
          provide: getRepositoryToken(RefreshSession),
          useValue: new InMemoryRepository<RefreshSession>(),
        },
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registra paciente, reenvia codigo, verifica, inicia sesion, refresca y cierra sesion', async () => {
    const email = `paciente-${Date.now()}@dentia.local`;

    await registerPatient(email);

    await request(app.getHttpServer())
      .post('/auth/resend-verification-code')
      .send({ email })
      .expect(200);

    const verificationCode = verificationCodes.get(email);
    expect(verificationCode).toEqual(expect.stringMatching(/^\d{6}$/));

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ email, code: verificationCode })
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.emailVerified).toBe(true);
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Password123' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toEqual(expect.any(String));
        expect(body.user.email).toBe(email);
      });

    const refreshCookie = getRefreshCookie(loginResponse);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toEqual(expect.any(String));
        expect(body.user.email).toBe(email);
      });

    const nextRefreshCookie = getRefreshCookie(refreshResponse);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', nextRefreshCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toBe('Sesion cerrada');
      });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', nextRefreshCookie)
      .expect(401);
  });

  it('cierra la sesion por inactividad', async () => {
    const email = `idle-${Date.now()}@dentia.local`;
    await registerAndVerifyPatient(email);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Password123' })
      .expect(200);

    await sleep(1200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', getRefreshCookie(loginResponse))
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Sesion cerrada por inactividad');
      });
  });

  it('recupera contrasena, invalida sesiones activas y permite iniciar con la nueva', async () => {
    const email = `reset-${Date.now()}@dentia.local`;
    await registerAndVerifyPatient(email);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Password123' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(200);

    const resetCode = passwordResetCodes.get(email);
    expect(resetCode).toEqual(expect.stringMatching(/^\d{6}$/));

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ email, code: resetCode, password: 'NewPassword123' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toBe('Contrasena actualizada correctamente');
      });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', getRefreshCookie(loginResponse))
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Password123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'NewPassword123' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.email).toBe(email);
      });
  });

  async function registerAndVerifyPatient(email: string) {
    await registerPatient(email);

    const verificationCode = verificationCodes.get(email);
    expect(verificationCode).toEqual(expect.stringMatching(/^\d{6}$/));

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ email, code: verificationCode })
      .expect(200);
  }

  function registerPatient(email: string) {
    return request(app.getHttpServer())
      .post('/auth/register')
      .field('email', email)
      .field('password', 'Password123')
      .field('fullName', 'Paciente Prueba')
      .field('role', 'PATIENT')
      .expect(201)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Registro iniciado. Revisa tu correo para verificar tu cuenta.',
        );
        expect(body.user.email).toBe(email);
        expect(body.user.emailVerified).toBe(false);
      });
  }

  function getRefreshCookie(response: request.Response) {
    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    const refreshCookie = cookies.find((cookie) =>
      cookie?.startsWith('dentia_refresh_token='),
    );

    expect(refreshCookie).toEqual(expect.any(String));
    return refreshCookie!.split(';')[0];
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
