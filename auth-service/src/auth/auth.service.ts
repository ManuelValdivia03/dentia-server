import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
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
      },
      {
        email: 'patient1@dentia.local',
        password: 'Patient123*',
        role: UserRole.PATIENT,
        domainId: 'p1',
      },
      {
        email: 'dentist1@dentia.local',
        password: 'Dentist123*',
        role: UserRole.DENTIST,
        domainId: 'd1',
      },
    ];

    for (const seedUser of seedUsers) {
      const passwordHash = await bcrypt.hash(seedUser.password, 10);

      const user = this.usersRepository.create({
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
        domainId: seedUser.domainId,
        isActive: true,
      });

      await this.usersRepository.save(user);
    }
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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        domainId: user.domainId,
      },
    };
  }
}