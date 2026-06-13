import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClinicalRecord } from './clinical-record.entity';

@Entity('clinical_encounters')
export class ClinicalEncounter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'record_id', type: 'uuid' })
  recordId!: string;

  @ManyToOne(() => ClinicalRecord, (record) => record.encounters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'record_id' })
  record!: ClinicalRecord;

  @Column({ name: 'patient_id', type: 'varchar', length: 80 })
  patientId!: string;

  @Column({ name: 'dentist_id', type: 'varchar', length: 80 })
  dentistId!: string;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true, unique: true })
  appointmentId?: string | null;

  @Column({ name: 'reason_for_visit', type: 'text' })
  reasonForVisit!: string;

  @Column({ name: 'arrival_description', type: 'text', nullable: true })
  arrivalDescription?: string | null;

  @Column({ type: 'text', nullable: true })
  symptoms?: string | null;

  @Column({ type: 'text' })
  diagnosis!: string;

  @Column({ name: 'treatment_performed', type: 'text', nullable: true })
  treatmentPerformed?: string | null;

  @Column({ name: 'treatment_plan', type: 'text', nullable: true })
  treatmentPlan?: string | null;

  @Column({ type: 'text', nullable: true })
  observations?: string | null;

  @Column({ name: 'prescription_id', type: 'uuid', nullable: true })
  prescriptionId?: string | null;

  @Column({
    name: 'file_ids',
    type: 'text',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  fileIds!: string[];

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}