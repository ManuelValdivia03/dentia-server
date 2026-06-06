import amqp, { ConsumeMessage } from 'amqplib';
import nodemailer from 'nodemailer';
import { Pool } from 'pg';

type AppointmentEventType =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.cancelled'
  | 'appointment.rescheduled';

interface AppointmentEvent {
  eventId: string;
  type: AppointmentEventType;
  occurredAt: string;
  data: {
    appointmentId: string;
    patientId: string;
    dentistId: string;
    startAt: string;
    endAt: string;
    status: string;
  };
}

interface UserSummary {
  email: string;
  fullName: string | null;
  role: string;
  domainId: string;
}

const serviceName = 'notifications-service';

const config = {
  rabbitMqUrl: env('RABBITMQ_URL', 'amqp://dentia:dentia123@rabbitmq:5672'),
  appointmentsQueue: env('RABBITMQ_QUEUE_APPOINTMENTS', 'appointments_events'),
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailFrom: env('MAIL_FROM', 'Dentia <no-reply@dentia.local>'),
};

const usersPool = new Pool({
  host: env('DB_HOST', 'postgres'),
  port: Number(process.env.DB_PORT ?? 5432),
  user: env('DB_USER', 'dentia'),
  password: env('DB_PASSWORD', 'dentia'),
  database: env('DB_NAME', 'dentia_auth'),
});

const transporter =
  config.smtpHost && config.smtpUser && config.smtpPass
    ? nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      })
    : null;

async function bootstrap() {
  const connection = await amqp.connect(config.rabbitMqUrl);
  const channel = await connection.createChannel();

  await channel.assertQueue(config.appointmentsQueue, {
    durable: true,
  });

  channel.prefetch(5);

  log('info', 'consumer_started', {
    queue: config.appointmentsQueue,
  });

  await channel.consume(config.appointmentsQueue, async (message) => {
    if (!message) return;

    try {
      await handleMessage(message);
      channel.ack(message);
    } catch (error) {
      log('error', 'notification_event_failed', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
      channel.ack(message);
    }
  });

  process.once('SIGTERM', async () => {
    log('info', 'shutdown_started');
    await channel.close();
    await connection.close();
    await usersPool.end();
    process.exit(0);
  });
}

async function handleMessage(message: ConsumeMessage) {
  const event = parseAppointmentEvent(message);

  if (!event) {
    log('warn', 'unsupported_event');
    return;
  }

  const [patient, dentist] = await Promise.all([
    findUserByDomainId(event.data.patientId),
    findUserByDomainId(event.data.dentistId),
  ]);

  const emails = buildAppointmentEmails(event, patient, dentist);

  await Promise.all(emails.map((email) => sendEmail(email)));

  log('info', 'appointment_notifications_sent', {
    eventId: event.eventId,
    type: event.type,
    recipients: emails.map((email) => email.to),
  });
}

function parseAppointmentEvent(message: ConsumeMessage): AppointmentEvent | null {
  const event = JSON.parse(message.content.toString('utf8')) as Partial<AppointmentEvent>;
  const supportedTypes: AppointmentEventType[] = [
    'appointment.created',
    'appointment.confirmed',
    'appointment.cancelled',
    'appointment.rescheduled',
  ];

  if (!event.type || !supportedTypes.includes(event.type)) {
    return null;
  }

  if (!event.data?.patientId || !event.data?.dentistId) {
    throw new Error('Appointment event is missing patientId or dentistId');
  }

  return event as AppointmentEvent;
}

async function findUserByDomainId(domainId: string): Promise<UserSummary | null> {
  const result = await usersPool.query<UserSummary>(
    `
      SELECT email, "fullName", role, "domainId"
      FROM users
      WHERE "domainId" = $1 AND "isActive" = true
      LIMIT 1
    `,
    [domainId],
  );

  return result.rows[0] ?? null;
}

function buildAppointmentEmails(
  event: AppointmentEvent,
  patient: UserSummary | null,
  dentist: UserSummary | null,
) {
  const patientName = displayName(patient, 'paciente');
  const dentistName = displayName(dentist, 'dentista');
  const when = formatAppointmentDate(event.data.startAt);
  const subjectByType: Record<AppointmentEventType, string> = {
    'appointment.created': 'Nueva solicitud de cita - Dentia',
    'appointment.confirmed': 'Cita confirmada - Dentia',
    'appointment.cancelled': 'Cita cancelada - Dentia',
    'appointment.rescheduled': 'Cita reagendada - Dentia',
  };
  const introByType: Record<AppointmentEventType, string> = {
    'appointment.created': 'Se registro una nueva solicitud de cita.',
    'appointment.confirmed': 'Tu cita fue confirmada.',
    'appointment.cancelled': 'Tu cita fue cancelada.',
    'appointment.rescheduled': 'Tu cita fue reagendada.',
  };

  return [
    patient && {
      to: patient.email,
      subject: subjectByType[event.type],
      text: `${introByType[event.type]}\n\nDentista: ${dentistName}\nFecha: ${when}\nEstado: ${event.data.status}`,
      html: appointmentHtml(introByType[event.type], patientName, dentistName, when, event.data.status),
    },
    dentist && {
      to: dentist.email,
      subject: subjectByType[event.type],
      text: `${introByType[event.type]}\n\nPaciente: ${patientName}\nFecha: ${when}\nEstado: ${event.data.status}`,
      html: appointmentHtml(introByType[event.type], dentistName, patientName, when, event.data.status),
    },
  ].filter(Boolean) as Array<{
    to: string;
    subject: string;
    text: string;
    html: string;
  }>;
}

function appointmentHtml(
  intro: string,
  recipientName: string,
  counterpartName: string,
  when: string,
  status: string,
) {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2>Dentia</h2>
      <p>Hola ${escapeHtml(recipientName)},</p>
      <p>${escapeHtml(intro)}</p>
      <ul>
        <li><strong>Relacionado con:</strong> ${escapeHtml(counterpartName)}</li>
        <li><strong>Fecha:</strong> ${escapeHtml(when)}</li>
        <li><strong>Estado:</strong> ${escapeHtml(status)}</li>
      </ul>
      <p>Entra a Dentia para ver el detalle de tu agenda.</p>
    </div>
  `;
}

async function sendEmail(email: { to: string; subject: string; text: string; html: string }) {
  if (!transporter) {
    log('warn', 'smtp_not_configured', {
      recipient: email.to,
      subject: email.subject,
    });
    return;
  }

  await transporter.sendMail({
    from: config.mailFrom,
    ...email,
  });
}

function displayName(user: UserSummary | null, fallback: string) {
  return user?.fullName || user?.email || fallback;
}

function formatAppointmentDate(value: string) {
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
  const localMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );

  if (!hasTimezone && localMatch) {
    const [, year, month, day, hour, minute] = localMatch;
    const date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
      ),
    );

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function env(name: string, fallback: string) {
  return process.env[name] || fallback;
}

function log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
  console[level](
    JSON.stringify({
      service: serviceName,
      event,
      ...data,
    }),
  );
}

bootstrap().catch((error) => {
  log('error', 'startup_failed', {
    reason: error instanceof Error ? error.message : 'unknown',
  });
  process.exit(1);
});
