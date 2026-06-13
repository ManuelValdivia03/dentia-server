import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClinicalEncounter } from './clinical-encounter.entity';

@Entity('clinical_records')
export class ClinicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'varchar', length: 80, unique: true })
  patientId!: string;

  @Column({ name: 'blood_type', type: 'varchar', length: 10, nullable: true })
  bloodType?: string | null;

  @Column({ type: 'text', nullable: true })
  allergies?: string | null;

  @Column({ name: 'chronic_diseases', type: 'text', nullable: true })
  chronicDiseases?: string | null;

  @Column({ name: 'current_medications', type: 'text', nullable: true })
  currentMedications?: string | null;

  @Column({ name: 'surgical_history', type: 'text', nullable: true })
  surgicalHistory?: string | null;

  @Column({ name: 'family_history', type: 'text', nullable: true })
  familyHistory?: string | null;

  @Column({ name: 'dental_history', type: 'text', nullable: true })
  dentalHistory?: string | null;

  @Column({ name: 'risk_notes', type: 'text', nullable: true })
  riskNotes?: string | null;

  @OneToMany(() => ClinicalEncounter, (encounter) => encounter.record)
  encounters!: ClinicalEncounter[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}