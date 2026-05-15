import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly verificationTtlMinutes = Number(
    process.env.EMAIL_VERIFICATION_TTL_MINUTES ?? 10,
  );

  private readonly resendCooldownSeconds = Number(
    process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS ?? 60,
  );

  private readonly maxVerificationAttempts = Number(
    process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS ?? 5,
  );

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
      });

      await this.usersRepository.save(user);
    }
  }

  async registerPatient(dto: RegisterDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationCode = this.generateVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const expiresAt = this.getVerificationExpirationDate();

    const patient = this.usersRepository.create({
      email: dto.email,
      passwordHash,
      role: UserRole.PATIENT,
      domainId: `p-${randomUUID()}`,
      fullName: dto.fullName,
      isActive: true,
      emailVerified: false,
      emailVerificationCodeHash: verificationCodeHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationAttempts: 0,
      emailVerificationLastSentAt: new Date(),
    });

    const savedPatient = await this.usersRepository.save(patient);

    await this.mailService.sendVerificationCode(
      savedPatient.email,
      verificationCode,
    );

    return {
      message:
        'Registro iniciado. Revisa tu correo para verificar tu cuenta.',
      user: this.toSafeUser(savedPatient),
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

    if (
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpiresAt
    ) {
      throw new BadRequestException(
        'No hay un código de verificación activo',
      );
    }

    if (user.emailVerificationAttempts >= this.maxVerificationAttempts) {
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
      await this.usersRepository.save(user);

      throw new UnauthorizedException('Código de verificación inválido');
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = null;

    const savedUser = await this.usersRepository.save(user);

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

    user.emailVerificationCodeHash = await bcrypt.hash(
      verificationCode,
      10,
    );
    user.emailVerificationExpiresAt = this.getVerificationExpirationDate();
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date();

    const savedUser = await this.usersRepository.save(user);

    await this.mailService.sendVerificationCode(
      savedUser.email,
      verificationCode,
    );

    return {
      message: 'Código de verificación reenviado',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Debes verificar tu correo antes de iniciar sesión',
      );
    }

    const payload = {
      sub: user.id,
      role: user.role,
      domainId: user.domainId,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.toSafeUser(user),
    };
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

    return dentists.map((dentist) => ({
      id: dentist.id,
      domainId: dentist.domainId,
      fullName: dentist.fullName,
      specialty: dentist.specialty,
      email: dentist.email,
    }));
  }

  async findDentistByDomainId(domainId: string) {
    const dentist = await this.usersRepository.findOne({
      where: { domainId, role: UserRole.DENTIST, isActive: true },
    });

    if (!dentist) {
      throw new NotFoundException('Dentista no encontrado');
    }

    return {
      id: dentist.id,
      domainId: dentist.domainId,
      fullName: dentist.fullName,
      specialty: dentist.specialty,
      email: dentist.email,
    };
  }

  private generateVerificationCode() {
    return randomInt(100000, 1000000).toString();
  }

  private getVerificationExpirationDate() {
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.verificationTtlMinutes,
    );
    return expiresAt;
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      domainId: user.domainId,
      fullName: user.fullName,
      specialty: user.specialty,
      emailVerified: user.emailVerified,
    };
  }
}