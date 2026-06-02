import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role!: UserRole;

  @Column()
  domainId!: string;

  @Column({ length: 120, nullable: true })
  fullName?: string;

  @Column({ length: 120, nullable: true })
  specialty?: string;

  @Column({ length: 60, nullable: true })
  cedulaProfesional?: string;

  @Column({ length: 160, nullable: true })
  escuela?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'bytea', nullable: true, select: false })
  profilePhoto?: Buffer | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  profilePhotoContentType?: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationCodeHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiresAt!: Date | null;

  @Column({ default: 0 })
  emailVerificationAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationLastSentAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationLockedUntil!: Date | null;

  @Column({ default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  loginLockedUntil!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetCodeHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiresAt!: Date | null;

  @Column({ default: 0 })
  passwordResetAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetLastSentAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetLockedUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
