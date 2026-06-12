import { Prescription } from '../entities/prescription.entity';

export type PrescriptionPdfContext = {
  patient?: {
    fullName?: string;
    email?: string;
  };
  dentist?: {
    fullName?: string;
    email?: string;
    specialty?: string;
    professionalLicense?: string;
  };
  appointment?: {
    reason?: string;
    startAt?: string | Date;
  };
};

export type GeneratedPdf = {
  filename: string;
  contentType: 'application/pdf';
  base64: string;
};

type PdfTextOptions = {
  size?: number;
  font?: 'F1' | 'F2';
  color?: string;
};

type PdfBoxOptions = {
  fill?: string;
  stroke?: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const PRIMARY = '0F6B85';
const TEXT = '172033';
const MUTED = '667085';
const LINE = '0F6B85';
const LIGHT_LINE = 'D8E2EC';

export function generatePrescriptionPdf(
  prescription: Prescription,
  context: PrescriptionPdfContext = {},
): GeneratedPdf {
  const builder = new PdfBuilder();

  const dentistName = displayValue(
    context.dentist?.fullName,
    'Dentista registrado',
  );

  const dentistSpecialty = displayValue(
    context.dentist?.specialty,
    'Odontología general',
  );

  const professionalLicense = displayValue(
    context.dentist?.professionalLicense,
    'No registrada',
  );

  const dentistEmail = displayValue(context.dentist?.email, 'No registrado');

  const patientName = displayValue(
    context.patient?.fullName,
    'Paciente registrado',
  );

  const patientEmail = displayValue(context.patient?.email, 'No registrado');

  builder.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, { fill: 'FFFFFF' });

  drawHeader(builder, {
    dentistName,
    dentistSpecialty,
    professionalLicense,
    dentistEmail,
  });

  let y = 632;

  builder.text('Datos del paciente', MARGIN_X, y, {
    size: 12,
    font: 'F2',
    color: PRIMARY,
  });

  y -= 26;

  drawFieldLine(builder, {
    label: 'Nombre',
    value: patientName,
    x: MARGIN_X,
    y,
    width: 300,
  });

  drawFieldLine(builder, {
    label: 'Fecha',
    value: formatDate(prescription.createdAt),
    x: 390,
    y,
    width: 168,
  });

  y -= 30;

  drawFieldLine(builder, {
    label: 'Correo',
    value: patientEmail,
    x: MARGIN_X,
    y,
    width: 300,
  });

  drawFieldLine(builder, {
    label: 'Folio',
    value: shortId(prescription.id),
    x: 390,
    y,
    width: 168,
  });

  y -= 42;

  y = drawClinicalSection(builder, {
    title: 'Diagnóstico',
    body: prescription.diagnosis || 'Sin diagnóstico registrado.',
    y,
    minHeight: 82,
  });

  y -= 18;

  y = drawClinicalSection(builder, {
    title: 'Indicaciones',
    body: prescription.indications || 'Sin indicaciones registradas.',
    y,
    minHeight: 130,
  });

  y -= 18;

  y = drawClinicalSection(builder, {
    title: 'Notas adicionales',
    body: prescription.notes?.trim() || 'Sin notas adicionales.',
    y,
    minHeight: 78,
  });

  drawSignature(builder, dentistName);
  drawFooter(builder, prescription);

  const pdf = builder.build();

  return {
    filename: `receta-${prescription.id}.pdf`,
    contentType: 'application/pdf',
    base64: pdf.toString('base64'),
  };
}

function drawHeader(
  builder: PdfBuilder,
  {
    dentistName,
    dentistSpecialty,
    professionalLicense,
    dentistEmail,
  }: {
    dentistName: string;
    dentistSpecialty: string;
    professionalLicense: string;
    dentistEmail: string;
  },
) {
  builder.text('Dentia', MARGIN_X, 742, {
    size: 22,
    font: 'F2',
    color: PRIMARY,
  });

  builder.text('RECETA ODONTOLÓGICA', MARGIN_X, 719, {
    size: 13,
    font: 'F2',
    color: TEXT,
  });

  builder.text(dentistName, 270, 742, {
    size: 15,
    font: 'F2',
    color: PRIMARY,
  });

  builder.text(dentistSpecialty, 270, 720, {
    size: 11,
    color: TEXT,
  });

  builder.text(`Cédula profesional: ${professionalLicense}`, 270, 704, {
    size: 10,
    color: MUTED,
  });

  builder.text(`Correo: ${dentistEmail}`, 270, 688, {
    size: 10,
    color: MUTED,
  });

  builder.line(MARGIN_X, 672, PAGE_WIDTH - MARGIN_X, 672, LINE);
  builder.line(MARGIN_X, 666, PAGE_WIDTH - MARGIN_X, 666, LIGHT_LINE);
}

function drawFieldLine(
  builder: PdfBuilder,
  {
    label,
    value,
    x,
    y,
    width,
  }: {
    label: string;
    value: string;
    x: number;
    y: number;
    width: number;
  },
) {
  builder.text(`${label}:`, x, y, {
    size: 10,
    font: 'F2',
    color: PRIMARY,
  });

  const valueX = x + 64;

  builder.text(trimForField(value, 34), valueX, y, {
    size: 10,
    color: TEXT,
  });

  builder.line(valueX, y - 5, x + width, y - 5, LIGHT_LINE);
}

function drawClinicalSection(
  builder: PdfBuilder,
  {
    title,
    body,
    y,
    minHeight,
  }: {
    title: string;
    body: string;
    y: number;
    minHeight: number;
  },
) {
  builder.text(title, MARGIN_X, y, {
    size: 12,
    font: 'F2',
    color: PRIMARY,
  });

  const lines = wrapText(body, 88);
  const boxHeight = Math.max(minHeight, 34 + lines.length * 15);

  builder.roundedRect(MARGIN_X, y - boxHeight, PAGE_WIDTH - MARGIN_X * 2, boxHeight - 18, {
    fill: 'FFFFFF',
    stroke: LIGHT_LINE,
  });

  let textY = y - 34;

  for (const line of lines) {
    builder.text(line, MARGIN_X + 16, textY, {
      size: 10.5,
      color: TEXT,
    });

    textY -= 15;
  }

  return y - boxHeight - 4;
}

function drawSignature(builder: PdfBuilder, dentistName: string) {
  builder.line(390, 116, PAGE_WIDTH - MARGIN_X, 116, LINE);

  builder.text(dentistName, 410, 96, {
    size: 10,
    color: TEXT,
  });

  builder.text('Firma del dentista', 410, 80, {
    size: 9,
    color: MUTED,
  });
}

function drawFooter(builder: PdfBuilder, prescription: Prescription) {
  builder.line(MARGIN_X, 62, PAGE_WIDTH - MARGIN_X, 62, LIGHT_LINE);

  builder.text('Documento generado por Dentia para seguimiento clínico odontológico.', MARGIN_X, 44, {
    size: 8.5,
    color: MUTED,
  });

  builder.text(`ID interno de receta: ${prescription.id}`, MARGIN_X, 30, {
    size: 7.5,
    color: '98A2B3',
  });

  builder.text(`ID interno de cita: ${prescription.appointmentId}`, 330, 30, {
    size: 7.5,
    color: '98A2B3',
  });
}

class PdfBuilder {
  private commands: string[] = [];

  text(value: string, x: number, y: number, options: PdfTextOptions = {}) {
    const font = options.font ?? 'F1';
    const size = options.size ?? 11;
    const color = options.color ?? '000000';

    this.commands.push(`${rgb(color)} rg`);
    this.commands.push(
      `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`,
    );
  }

  rect(x: number, y: number, width: number, height: number, options: PdfBoxOptions = {}) {
    if (options.fill) {
      this.commands.push(`${rgb(options.fill)} rg`);
      this.commands.push(`${x} ${y} ${width} ${height} re f`);
    }

    if (options.stroke) {
      this.commands.push(`${rgb(options.stroke)} RG`);
      this.commands.push(`${x} ${y} ${width} ${height} re S`);
    }
  }

  roundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: PdfBoxOptions = {},
  ) {
    this.rect(x, y, width, height, options);
  }

  line(x1: number, y1: number, x2: number, y2: number, color = '000000') {
    this.commands.push(`${rgb(color)} RG`);
    this.commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  build(): Buffer {
    const content = this.commands.join('\n');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
      `6 0 obj\n<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream\nendobj\n`,
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
}

function wrapText(value: string, maxLength: number): string[] {
  const normalized = toWinAnsiSafe(value).replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return ['Sin información registrada.'];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength) {
      if (current) {
        lines.push(current);
      }

      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function escapePdfText(value: string): string {
  return toWinAnsiSafe(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function rgb(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  return `${roundColor(r)} ${roundColor(g)} ${roundColor(b)}`;
}

function roundColor(value: number) {
  return Number(value.toFixed(4));
}

function formatDate(value?: string | Date): string {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function displayValue(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function trimForField(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function toWinAnsiSafe(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}