import { Prescription } from '../entities/prescription.entity';

export type GeneratedPdf = {
  filename: string;
  contentType: 'application/pdf';
  base64: string;
};

export function generatePrescriptionPdf(prescription: Prescription): GeneratedPdf {
  const lines = [
    'Dentia',
    'Receta medica odontologica',
    '',
    `Receta ID: ${prescription.id}`,
    `Cita ID: ${prescription.appointmentId}`,
    `Paciente ID: ${prescription.patientId}`,
    `Dentista ID: ${prescription.dentistId}`,
    `Fecha: ${formatDate(prescription.createdAt)}`,
    '',
    'Diagnostico:',
    prescription.diagnosis,
    '',
    'Indicaciones:',
    prescription.indications,
    '',
    'Notas:',
    prescription.notes?.trim() ? prescription.notes : 'Sin notas',
  ];

  const pdf = buildSimplePdf(lines);

  return {
    filename: `prescription-${prescription.id}.pdf`,
    contentType: 'application/pdf',
    base64: pdf.toString('base64'),
  };
}

function buildSimplePdf(lines: string[]): Buffer {
  const escapedLines = lines
    .map(toWinAnsiSafe)
    .flatMap((line) => splitLongLine(line, 82));

  const textCommands = escapedLines
    .map((line, index) => {
      const y = 760 - index * 18;
      return `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(textCommands, 'latin1')} >>\nstream\n${textCommands}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i < offsets.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

function escapePdfText(value: string): string {
  return toWinAnsiSafe(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function splitLongLine(value: string, maxLength: number): string[] {
  if (value.length <= maxLength) {
    return [value];
  }

  const result: string[] = [];
  let remaining = value;

  while (remaining.length > maxLength) {
    result.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }

  if (remaining.length > 0) {
    result.push(remaining);
  }

  return result;
}

function formatDate(value: Date): string {
  return new Date(value).toISOString().replace('T', ' ').slice(0, 19);
}

function toWinAnsiSafe(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/€/g, 'EUR')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}