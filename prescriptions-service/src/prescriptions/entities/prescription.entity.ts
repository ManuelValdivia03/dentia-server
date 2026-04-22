import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrescriptionStatus } from '../enums/prescription-status.enum';

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  appointmentId!: string;

  @Column()
  patientId!: string;

  @Column()
  dentistId!: string;

  @Column({ type: 'text' })
  diagnosis!: string;

  @Column({ type: 'text' })
  indications!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.ACTIVE,
  })
  status!: PrescriptionStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}