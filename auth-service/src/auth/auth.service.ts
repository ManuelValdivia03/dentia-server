import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
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

    const patient = this.usersRepository.create({
      email: dto.email,
      passwordHash,
      role: UserRole.PATIENT,
      domainId: `p-${randomUUID()}`,
      fullName: dto.fullName,
      isActive: true,
    });

    const savedPatient = await this.usersRepository.save(patient);
    return this.toSafeUser(savedPatient);
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

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      domainId: user.domainId,
      fullName: user.fullName,
      specialty: user.specialty,
    };
  }
}