import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { MailService } from '../mail/mail.service';
import { RefreshSession } from './entities/refresh-session.entity';

function getEnvNumber(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = Number(value);

  return value && Number.isFinite(parsed) ? parsed : fallback;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  private readonly verificationTtlMinutes = Number(
    process.env.EMAIL_VERIFICATION_TTL_MINUTES ?? 10,
  );

  private readonly resendCooldownSeconds = Number(
    process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS ?? 60,
  );

  private readonly maxVerificationAttempts = Number(
    process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS ?? 5,
  );

  private readonly emailVerificationLockoutMs =
    getEnvNumber('EMAIL_VERIFICATION_LOCKOUT_SECONDS', 900) * 1000;

  private readonly maxFailedLoginAttempts = getEnvNumber(
    'AUTH_MAX_FAILED_LOGIN_ATTEMPTS',
    5,
  );

  private readonly loginLockoutMs =
    getEnvNumber('AUTH_LOGIN_LOCKOUT_SECONDS', 900) * 1000;

  private readonly passwordResetTtlMinutes = getEnvNumber(
    'PASSWORD_RESET_TTL_MINUTES',
    10,
  );

  private readonly passwordResetCooldownSeconds = getEnvNumber(
    'PASSWORD_RESET_RESEND_COOLDOWN_SECONDS',
    60,
  );

  private readonly maxPasswordResetAttempts = getEnvNumber(
    'PASSWORD_RESET_MAX_ATTEMPTS',
    5,
  );

  private readonly passwordResetLockoutMs =
    getEnvNumber('PASSWORD_RESET_LOCKOUT_SECONDS', 900) * 1000;

  private readonly accessTokenTtl = process.env.ACCESS_TOKEN_TTL || '2m';

  private readonly refreshIdleTimeoutMs =
    getEnvNumber('REFRESH_TOKEN_IDLE_TIMEOUT_SECONDS', 300) * 1000;

  private readonly refreshAbsoluteTtlMs =
    getEnvNumber('REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS', 28800) * 1000;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionsRepository: Repository<RefreshSession>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    const usersCount = await this.usersRepository.count();

    if (usersCount > 0) {
      return;
    }

    const seedUsers = [
      {
        email: 'admin@dentia.local',
        password: 'Admin123*',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        fullName: 'Administrador Dentia',
      },
      {
        email: 'patient1@dentia.local',
        password: 'Patient123*',
        role: UserRole.PATIENT,
        domainId: 'p1',
        fullName: 'Paciente Demo',
      },
      {
        email: 'dentist1@dentia.local',
        password: 'Dentist123*',
        role: UserRole.DENTIST,
        domainId: 'd1',
        fullName: 'Dra. Demo Dentia',
        specialty: 'Odontología general',
      },
    ];

    for (const seedUser of seedUsers) {
      const passwordHash = await bcrypt.hash(seedUser.password, 10);

      const user = this.usersRepository.create({
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
        domainId: seedUser.domainId,
        fullName: seedUser.fullName,
        specialty: seedUser.specialty,
        isActive: true,
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: null,
        emailVerificationLockedUntil: null,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetAttempts: 0,
        passwordResetLastSentAt: null,
        passwordResetLockedUntil: null,
      });

      await this.usersRepository.save(user);
    }
  }

  async registerPatient(dto: RegisterDto, photo?: Express.Multer.File) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        return this.restartEmailVerification(existingUser);
      }

      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const role =
      dto.role === UserRole.DENTIST ? UserRole.DENTIST : UserRole.PATIENT;

    const domainPrefix = role === UserRole.DENTIST ? 'd' : 'p';

    if (role === UserRole.DENTIST) {
      if (!dto.cedulaProfesional || !dto.escuela || !dto.descripcion) {
        throw new BadRequestException(
          'La cédula profesional, escuela y descripción son obligatorias para dentistas',
        );
      }

      const cedulaTaken = await this.usersRepository.findOne({
        where: {
          role: UserRole.DENTIST,
          cedulaProfesional: dto.cedulaProfesional,
        },
      });

      if (cedulaTaken) {
        throw new ConflictException(
          'Ya existe un dentista con esa cédula profesional',
        );
      }
    }

    this.assertValidProfilePhoto(photo, role === UserRole.DENTIST);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationCode = this.generateVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const expiresAt = this.getVerificationExpirationDate();

    const user = this.usersRepository.create({
      email: dto.email,
      passwordHash,
      role,
      domainId: `${domainPrefix}-${randomUUID()}`,
      fullName: dto.fullName,
      cedulaProfesional:
        role === UserRole.DENTIST ? dto.cedulaProfesional : undefined,
      escuela: role === UserRole.DENTIST ? dto.escuela : undefined,
      descripcion: role === UserRole.DENTIST ? dto.descripcion : undefined,
      profilePhoto: photo?.buffer,
      profilePhotoContentType: photo?.mimetype,
      isActive: true,
      emailVerified: false,
      emailVerificationCodeHash: verificationCodeHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationAttempts: 0,
      emailVerificationLastSentAt: new Date(),
      emailVerificationLockedUntil: null,
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      passwordResetCodeHash: null,
      passwordResetExpiresAt: null,
      passwordResetAttempts: 0,
      passwordResetLastSentAt: null,
      passwordResetLockedUntil: null,
    });

    const savedUser = await this.usersRepository.save(user);

    await this.mailService.sendVerificationCode(
      savedUser.email,
      verificationCode,
    );

    return {
      message: 'Registro iniciado. Revisa tu correo para verificar tu cuenta.',
      user: this.toSafeUser(savedUser),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      return {
        message: 'El correo ya estaba verificado',
        user: this.toSafeUser(user),
      };
    }

    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('No hay un código de verificación activo');
    }

    if (this.isLocked(user.emailVerificationLockedUntil)) {
      this.logger.warn(`email verification blocked email=${user.email}`);
      throw new HttpException(
        'Demasiados intentos. Solicita un nuevo codigo mas tarde',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.emailVerificationAttempts >= this.maxVerificationAttempts) {
      user.emailVerificationLockedUntil = this.getLockoutExpirationDate(
        this.emailVerificationLockoutMs,
      );
      await this.usersRepository.save(user);

      throw new HttpException(
        'Demasiados intentos. Solicita un nuevo código',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El código de verificación expiró');
    }

    const codeMatches = await bcrypt.compare(
      dto.code,
      user.emailVerificationCodeHash,
    );

    if (!codeMatches) {
      user.emailVerificationAttempts += 1;

      if (user.emailVerificationAttempts >= this.maxVerificationAttempts) {
        user.emailVerificationLockedUntil = this.getLockoutExpirationDate(
          this.emailVerificationLockoutMs,
        );
        await this.usersRepository.save(user);
        this.logger.warn(
          `email verification locked email=${user.email} attempts=${user.emailVerificationAttempts}`,
        );

        throw new HttpException(
          'Demasiados intentos. Solicita un nuevo codigo mas tarde',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.usersRepository.save(user);

      throw new UnauthorizedException('Código de verificación inválido');
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = null;
    user.emailVerificationLockedUntil = null;

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`email verified userId=${savedUser.id}`);

    return {
      message: 'Correo verificado correctamente',
      user: this.toSafeUser(savedUser),
    };
  }

  async resendVerificationCode(dto: ResendVerificationCodeDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      return {
        message: 'El correo ya está verificado',
      };
    }

    if (user.emailVerificationLastSentAt) {
      const secondsSinceLastSend =
        (Date.now() - user.emailVerificationLastSentAt.getTime()) / 1000;

      if (secondsSinceLastSend < this.resendCooldownSeconds) {
        throw new HttpException(
          'Espera antes de solicitar otro código',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const verificationCode = this.generateVerificationCode();

    user.emailVerificationCodeHash = await bcrypt.hash(verificationCode, 10);
    user.emailVerificationExpiresAt = this.getVerificationExpirationDate();
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date();
    user.emailVerificationLockedUntil = null;

    const savedUser = await this.usersRepository.save(user);

    await this.mailService.sendVerificationCode(
      savedUser.email,
      verificationCode,
    );

    return {
      message: 'Código de verificación reenviado',
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const message =
      'Si el correo existe y esta verificado, enviaremos un codigo de recuperacion.';
    const user = await this.usersRepository.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user || !user.emailVerified) {
      this.logger.warn(
        `password reset requested email=${dto.email} reason=not_available`,
      );
      return { message };
    }

    if (this.isLocked(user.passwordResetLockedUntil)) {
      this.logger.warn(`password reset blocked email=${user.email}`);
      throw new HttpException(
        'Demasiadas solicitudes. Intenta de nuevo mas tarde',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.passwordResetLastSentAt) {
      const secondsSinceLastSend = Math.floor(
        (Date.now() - user.passwordResetLastSentAt.getTime()) / 1000,
      );

      if (secondsSinceLastSend < this.passwordResetCooldownSeconds) {
        throw new BadRequestException(
          `Espera ${this.passwordResetCooldownSeconds - secondsSinceLastSend} segundos antes de solicitar otro codigo`,
        );
      }
    }

    const resetCode = this.generateVerificationCode();

    user.passwordResetCodeHash = await bcrypt.hash(resetCode, 10);
    user.passwordResetExpiresAt = this.getPasswordResetExpirationDate();
    user.passwordResetAttempts = 0;
    user.passwordResetLastSentAt = new Date();
    user.passwordResetLockedUntil = null;

    const savedUser = await this.usersRepository.save(user);

    await this.mailService.sendPasswordResetCode(savedUser.email, resetCode);
    this.logger.log(`password reset code sent userId=${savedUser.id}`);

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user || !user.emailVerified) {
      this.logger.warn(
        `password reset failed email=${dto.email} reason=not_available`,
      );
      throw new UnauthorizedException('Codigo de recuperacion invalido');
    }

    if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      throw new BadRequestException('Solicita un codigo de recuperacion nuevo');
    }

    if (this.isLocked(user.passwordResetLockedUntil)) {
      this.logger.warn(`password reset blocked email=${user.email}`);
      throw new HttpException(
        'Demasiados intentos. Solicita un nuevo codigo mas tarde',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.passwordResetAttempts >= this.maxPasswordResetAttempts) {
      user.passwordResetLockedUntil = this.getLockoutExpirationDate(
        this.passwordResetLockoutMs,
      );
      await this.usersRepository.save(user);

      throw new HttpException(
        'Demasiados intentos. Solicita un nuevo codigo mas tarde',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Codigo de recuperacion expirado');
    }

    const codeMatches = await bcrypt.compare(
      dto.code,
      user.passwordResetCodeHash,
    );

    if (!codeMatches) {
      user.passwordResetAttempts += 1;

      if (user.passwordResetAttempts >= this.maxPasswordResetAttempts) {
        user.passwordResetLockedUntil = this.getLockoutExpirationDate(
          this.passwordResetLockoutMs,
        );
        await this.usersRepository.save(user);
        this.logger.warn(
          `password reset locked email=${user.email} attempts=${user.passwordResetAttempts}`,
        );

        throw new HttpException(
          'Demasiados intentos. Solicita un nuevo codigo mas tarde',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.usersRepository.save(user);

      throw new UnauthorizedException('Codigo de recuperacion invalido');
    }

    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.passwordResetCodeHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetAttempts = 0;
    user.passwordResetLastSentAt = null;
    user.passwordResetLockedUntil = null;
    user.failedLoginAttempts = 0;
    user.loginLockedUntil = null;

    const savedUser = await this.usersRepository.save(user);
    await this.revokeActiveUserSessions(savedUser.id);
    this.logger.log(`password reset success userId=${savedUser.id}`);

    return { message: 'Contrasena actualizada correctamente' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      this.logger.warn(`login failed email=${dto.email} reason=user_not_found`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (this.isLocked(user.loginLockedUntil)) {
      this.logger.warn(`login blocked email=${user.email}`);
      throw new HttpException(
        'Demasiados intentos fallidos. Intenta de nuevo mas tarde',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await this.recordFailedLogin(user);
      if (this.isLocked(user.loginLockedUntil)) {
        throw new HttpException(
          'Demasiados intentos fallidos. Intenta de nuevo mas tarde',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.emailVerified) {
      this.logger.warn(
        `login blocked email=${user.email} reason=email_unverified`,
      );
      throw new UnauthorizedException({
        message: 'Debes verificar tu correo antes de iniciar sesion',
        requiresEmailVerification: true,
        email: user.email,
      });
    }

    const { session, refreshToken } = await this.createRefreshSession(user.id);
    const accessToken = await this.signAccessToken(user, session.id);
    await this.clearFailedLogins(user);
    this.logger.log(`login success userId=${user.id} role=${user.role}`);

    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser(user),
    };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      this.logger.warn('refresh failed reason=missing_refresh_token');
      throw new UnauthorizedException('Sesion expirada');
    }

    const now = new Date();
    const tokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.refreshSessionsRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
    });

    if (!session) {
      this.logger.warn('refresh failed reason=session_not_found');
      throw new UnauthorizedException('Sesion expirada');
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.revokeSession(session, now);
      this.logger.warn(`refresh failed sessionId=${session.id} reason=expired`);
      throw new UnauthorizedException('Sesion expirada');
    }

    if (
      session.lastActivityAt.getTime() + this.refreshIdleTimeoutMs <=
      now.getTime()
    ) {
      await this.revokeSession(session, now);
      this.logger.warn(
        `refresh failed sessionId=${session.id} reason=idle_timeout`,
      );
      throw new UnauthorizedException('Sesion cerrada por inactividad');
    }

    const user = await this.usersRepository.findOne({
      where: { id: session.userId, isActive: true },
    });

    if (!user) {
      await this.revokeSession(session, now);
      this.logger.warn(
        `refresh failed sessionId=${session.id} reason=user_not_found`,
      );
      throw new UnauthorizedException('Sesion expirada');
    }

    const nextRefreshToken = this.generateRefreshToken();

    session.tokenHash = this.hashRefreshToken(nextRefreshToken);
    session.lastActivityAt = now;

    await this.refreshSessionsRepository.save(session);
    const accessToken = await this.signAccessToken(user, session.id);
    this.logger.log(
      `refresh success userId=${user.id} sessionId=${session.id}`,
    );

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: this.toSafeUser(user),
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      this.logger.log('logout success reason=no_refresh_token');
      return { message: 'Sesion cerrada' };
    }

    const session = await this.refreshSessionsRepository.findOne({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: IsNull(),
      },
    });

    if (session) {
      await this.revokeSession(session, new Date());
      this.logger.log(
        `logout success sessionId=${session.id} userId=${session.userId}`,
      );
    }

    return { message: 'Sesion cerrada' };
  }

  async getProfileByUserId(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toSafeUser(user);
  }

  async findAllDentists() {
    const dentists = await this.usersRepository.find({
      where: { role: UserRole.DENTIST, isActive: true },
      order: { fullName: 'ASC', email: 'ASC' },
    });

    return dentists.map((dentist) => this.toDentistView(dentist));
  }

  async findDentistByDomainId(domainId: string) {
    const dentist = await this.usersRepository.findOne({
      where: { domainId, role: UserRole.DENTIST, isActive: true },
    });

    if (!dentist) {
      throw new NotFoundException('Dentista no encontrado');
    }

    return this.toDentistView(dentist);
  }

  async getDentistPhoto(domainId: string) {
    return this.getProfilePhoto(domainId, UserRole.DENTIST);
  }

  async getProfilePhoto(domainId: string, role?: UserRole) {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.profilePhoto')
      .where('user.domainId = :domainId', { domainId })
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    const user = await query.getOne();

    if (!user || !user.profilePhoto) {
      throw new NotFoundException('Foto de perfil no encontrada');
    }

    return {
      buffer: user.profilePhoto,
      contentType: user.profilePhotoContentType ?? 'application/octet-stream',
    };
  }

  private generateVerificationCode() {
    return randomInt(100000, 1000000).toString();
  }

  private getVerificationExpirationDate() {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.verificationTtlMinutes);
    return expiresAt;
  }

  private getPasswordResetExpirationDate() {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.passwordResetTtlMinutes);
    return expiresAt;
  }

  private async restartEmailVerification(user: User) {
    const verificationCode = this.generateVerificationCode();

    user.emailVerificationCodeHash = await bcrypt.hash(verificationCode, 10);
    user.emailVerificationExpiresAt = this.getVerificationExpirationDate();
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date();
    user.emailVerificationLockedUntil = null;

    const savedUser = await this.usersRepository.save(user);

    await this.mailService.sendVerificationCode(
      savedUser.email,
      verificationCode,
    );

    return {
      message:
        'Ya habia un registro pendiente. Te enviamos un nuevo codigo de verificacion.',
      user: this.toSafeUser(savedUser),
      requiresEmailVerification: true,
    };
  }

  private isLocked(lockedUntil?: Date | null) {
    return Boolean(lockedUntil && lockedUntil.getTime() > Date.now());
  }

  private getLockoutExpirationDate(lockoutMs: number) {
    return new Date(Date.now() + lockoutMs);
  }

  private async recordFailedLogin(user: User) {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;

    if (user.failedLoginAttempts >= this.maxFailedLoginAttempts) {
      user.loginLockedUntil = this.getLockoutExpirationDate(
        this.loginLockoutMs,
      );
      this.logger.warn(
        `login locked email=${user.email} attempts=${user.failedLoginAttempts}`,
      );
    } else {
      this.logger.warn(
        `login failed email=${user.email} attempts=${user.failedLoginAttempts}`,
      );
    }

    await this.usersRepository.save(user);
  }

  private async clearFailedLogins(user: User) {
    if (!user.failedLoginAttempts && !user.loginLockedUntil) {
      return;
    }

    user.failedLoginAttempts = 0;
    user.loginLockedUntil = null;
    await this.usersRepository.save(user);
  }

  private async createRefreshSession(userId: string) {
    const refreshToken = this.generateRefreshToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.refreshAbsoluteTtlMs);

    const session = this.refreshSessionsRepository.create({
      userId,
      tokenHash: this.hashRefreshToken(refreshToken),
      lastActivityAt: now,
      expiresAt,
      revokedAt: null,
    });

    const savedSession = await this.refreshSessionsRepository.save(session);

    return {
      session: savedSession,
      refreshToken,
    };
  }

  private async signAccessToken(user: User, sessionId: string) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        sid: sessionId,
        role: user.role,
        domainId: user.domainId,
        email: user.email,
      },
      {
        expiresIn: this.accessTokenTtl as any,
      },
    );
  }

  private generateRefreshToken() {
    return randomBytes(64).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private async revokeSession(session: RefreshSession, revokedAt: Date) {
    session.revokedAt = revokedAt;
    await this.refreshSessionsRepository.save(session);
  }

  private async revokeActiveUserSessions(userId: string) {
    await this.refreshSessionsRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private toSafeUser(user: User) {
    const isDentist = user.role === UserRole.DENTIST;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      domainId: user.domainId,
      fullName: user.fullName,
      specialty: user.specialty,
      cedulaProfesional: isDentist ? user.cedulaProfesional : undefined,
      escuela: isDentist ? user.escuela : undefined,
      descripcion: isDentist ? user.descripcion : undefined,
      photoUrl: this.buildPhotoUrl(user),
      emailVerified: user.emailVerified,
    };
  }

  private toDentistView(dentist: User) {
    return {
      id: dentist.id,
      domainId: dentist.domainId,
      fullName: dentist.fullName,
      specialty: dentist.specialty,
      cedulaProfesional: dentist.cedulaProfesional,
      escuela: dentist.escuela,
      descripcion: dentist.descripcion,
      photoUrl: this.buildPhotoUrl(dentist),
      email: dentist.email,
    };
  }

  private buildPhotoUrl(user: User) {
    return user.profilePhotoContentType
      ? `/profile-photos/${user.domainId}`
      : null;
  }

  private assertValidProfilePhoto(
    photo?: Express.Multer.File,
    required = false,
  ) {
    if (!photo || !photo.buffer || photo.size === 0) {
      if (required) {
        throw new BadRequestException('La foto de perfil es obligatoria');
      }

      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowed.includes(photo.mimetype)) {
      throw new BadRequestException(
        'La foto debe ser una imagen JPEG, PNG o WEBP',
      );
    }

    if (!this.matchesImageSignature(photo.buffer, photo.mimetype)) {
      throw new BadRequestException('La imagen no es válida');
    }
  }

  private matchesImageSignature(buffer: Buffer, mimetype: string): boolean {
    if (buffer.length < 12) {
      return false;
    }

    switch (mimetype) {
      case 'image/jpeg':
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      case 'image/png':
        return (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47 &&
          buffer[4] === 0x0d &&
          buffer[5] === 0x0a &&
          buffer[6] === 0x1a &&
          buffer[7] === 0x0a
        );
      case 'image/webp':
        return (
          buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP'
        );
      default:
        return false;
    }
  }
}
