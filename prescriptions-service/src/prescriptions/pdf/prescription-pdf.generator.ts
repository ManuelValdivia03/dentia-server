import { Prescription } from '../entities/prescription.entity';

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
const MARGIN_X = 48;

export function generatePrescriptionPdf(prescription: Prescription): GeneratedPdf {
  const builder = new PdfBuilder();

  builder.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, { fill: 'FFFFFF' });

  builder.rect(0, PAGE_HEIGHT - 96, PAGE_WIDTH, 96, { fill: '0F6B85' });
  builder.text('Dentia', MARGIN_X, 735, {
    size: 26,
    font: 'F2',
    color: 'FFFFFF',
  });
  builder.text('Receta medica odontologica', MARGIN_X, 712, {
    size: 13,
    color: 'EAF7F8',
  });

  builder.text('Documento clinico', 420, 735, {
    size: 11,
    font: 'F2',
    color: 'FFFFFF',
  });
  builder.text(`Fecha: ${formatDate(prescription.createdAt)}`, 420, 716, {
    size: 10,
    color: 'EAF7F8',
  });

  let y = 650;

  builder.text('Datos de la receta', MARGIN_X, y, {
    size: 16,
    font: 'F2',
    color: '172033',
  });

  y -= 20;

  builder.roundedRect(MARGIN_X, y - 72, PAGE_WIDTH - MARGIN_X * 2, 84, {
    fill: 'F6FAFC',
    stroke: 'D8E2EC',
  });

  builder.text('Folio de receta', MARGIN_X + 18, y - 6, {
    size: 9,
    font: 'F2',
    color: '667085',
  });
  builder.text(shortId(prescription.id), MARGIN_X + 18, y - 24, {
    size: 12,
    font: 'F2',
    color: '172033',
  });

  builder.text('Folio de cita', 230, y - 6, {
    size: 9,
    font: 'F2',
    color: '667085',
  });
  builder.text(shortId(prescription.appointmentId), 230, y - 24, {
    size: 12,
    font: 'F2',
    color: '172033',
  });

  builder.text('Estado', 420, y - 6, {
    size: 9,
    font: 'F2',
    color: '667085',
  });
  builder.text('Activa', 420, y - 24, {
    size: 12,
    font: 'F2',
    color: '0F6B85',
  });

  y -= 120;

  y = drawSection(builder, {
    title: 'Diagnostico',
    body: prescription.diagnosis || 'Sin diagnostico registrado.',
    y,
  });

  y -= 24;

  y = drawSection(builder, {
    title: 'Indicaciones',
    body: prescription.indications || 'Sin indicaciones registradas.',
    y,
  });

  y -= 24;

  y = drawSection(builder, {
    title: 'Notas adicionales',
    body: prescription.notes?.trim() || 'Sin notas adicionales.',
    y,
  });

  builder.line(MARGIN_X, 112, 250, 112, 'D8E2EC');
  builder.text('Firma del dentista', MARGIN_X, 92, {
    size: 10,
    color: '667085',
  });

  builder.text('Este documento fue generado por Dentia.', MARGIN_X, 52, {
    size: 9,
    color: '667085',
  });

  builder.text(`Receta ${prescription.id}`, MARGIN_X, 36, {
    size: 8,
    color: '98A2B3',
  });

  const pdf = builder.build();

  return {
    filename: `receta-${prescription.id}.pdf`,
    contentType: 'application/pdf',
    base64: pdf.toString('base64'),
  };
}

function drawSection(
  builder: PdfBuilder,
  {
    title,
    body,
    y,
  }: {
    title: string;
    body: string;
    y: number;
  },
) {
  const lines = wrapText(body, 86);
  const boxHeight = Math.max(76, 42 + lines.length * 15);

  builder.text(title, MARGIN_X, y, {
    size: 14,
    font: 'F2',
    color: '172033',
  });

  builder.roundedRect(MARGIN_X, y - boxHeight, PAGE_WIDTH - MARGIN_X * 2, boxHeight - 18, {
    fill: 'FFFFFF',
    stroke: 'D8E2EC',
  });

  let textY = y - 34;

  for (const line of lines) {
    builder.text(line, MARGIN_X + 18, textY, {
      size: 11,
      color: '344054',
    });
    textY -= 15;
  }

  return y - boxHeight - 6;
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
    // PDF manual sin curvas complejas: caja rectangular limpia.
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
    return ['Sin informacion registrada.'];
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

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function toWinAnsiSafe(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}