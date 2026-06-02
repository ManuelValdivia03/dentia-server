import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly smtpHost = process.env.SMTP_HOST;
  private readonly smtpPort = Number(process.env.SMTP_PORT ?? 587);
  private readonly smtpUser = process.env.SMTP_USER;
  private readonly smtpPass = process.env.SMTP_PASS;
  private readonly mailFrom =
    process.env.MAIL_FROM ?? 'Dentia <no-reply@dentia.local>';

  async sendVerificationCode(to: string, code: string) {
    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      console.warn(
        `[MAIL DEV] SMTP no configurado. Código para ${to}: ${code}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpPort === 465,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPass,
      },
    });

    try {
      await transporter.sendMail({
        from: this.mailFrom,
        to,
        subject: 'Código de verificación - Dentia',
        text: `Tu código de verificación de Dentia es: ${code}. Este código expira en 10 minutos.`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Verificación de correo - Dentia</h2>
            <p>Tu código de verificación es:</p>
            <h1 style="letter-spacing: 4px;">${code}</h1>
            <p>Este código expira en 10 minutos.</p>
            <p>Si no solicitaste este registro, ignora este correo.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('SMTP SEND ERROR:', error);

      throw new ServiceUnavailableException(
        'No se pudo enviar el correo de verificación',
      );
    }
  }

  async sendPasswordResetCode(to: string, code: string) {
    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      console.warn(
        `[MAIL DEV] SMTP no configurado. Codigo de recuperacion para ${to}: ${code}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpPort === 465,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPass,
      },
    });

    try {
      await transporter.sendMail({
        from: this.mailFrom,
        to,
        subject: 'Recuperacion de contrasena - Dentia',
        text: `Tu codigo para recuperar tu contrasena de Dentia es: ${code}. Este codigo expira en 10 minutos.`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Recuperacion de contrasena - Dentia</h2>
            <p>Tu codigo de recuperacion es:</p>
            <h1 style="letter-spacing: 4px;">${code}</h1>
            <p>Este codigo expira en 10 minutos.</p>
            <p>Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('SMTP SEND ERROR:', error);

      throw new ServiceUnavailableException(
        'No se pudo enviar el correo de recuperacion',
      );
    }
  }
}
