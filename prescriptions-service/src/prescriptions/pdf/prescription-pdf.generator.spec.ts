import { describe, expect, it } from '@jest/globals';
import { Prescription } from '../entities/prescription.entity';
import { PrescriptionStatus } from '../enums/prescription-status.enum';
import { generatePrescriptionPdf } from './prescription-pdf.generator';

describe('generatePrescriptionPdf', () => {
  it('should generate a valid PDF payload', () => {
    const prescription = {
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p1',
      dentistId: 'd1',
      diagnosis: 'Gingivitis leve',
      indications: 'Cepillado tres veces al día y uso de hilo dental.',
      notes: 'Revisión en dos semanas.',
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date('2026-05-28T22:03:49Z'),
      updatedAt: new Date('2026-05-28T22:03:49Z'),
    } as Prescription;

    const result = generatePrescriptionPdf(prescription);
    const pdf = Buffer.from(result.base64, 'base64');
    const pdfText = pdf.toString('latin1');

    expect(result.filename).toBe('receta-rx-1.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfText).toContain('Gingivitis leve');
    expect(pdfText).toContain('Cepillado tres veces al día');
    expect(pdfText).toContain('Revisión en dos semanas');
  });
});