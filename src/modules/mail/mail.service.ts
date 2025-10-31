// src/modules/mail/mail.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('MAIL_HOST'),
      port: +(config.get<number>('MAIL_PORT') ?? 587),
      auth: {
        user: config.get('MAIL_USER'),
        pass: config.get('MAIL_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to,
        subject,
        text,
        html,
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendEmailVerificationOtp(email: string, code: string) {
    try {
      const minutes = this.config.get<string>('OTP_EXPIRATION_MINUTES') ?? '15';
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: email,
        subject: 'Verify your email',
        text: `Your verification code is: ${code}\n\nIt expires in ${minutes} minutes.`,
        html: `
          <div>
            <h2>Email Verification</h2>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>It expires in ${minutes} minutes.</p>
          </div>
        `,
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendResetPasswordOtp(email: string, code: string) {
    try {
      const minutes = this.config.get<string>('OTP_EXPIRATION_MINUTES') ?? '15';
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: email,
        subject: 'Your Password Reset OTP',
        text: `Your password reset OTP is: ${code}\n\nIt expires in ${minutes} minutes.`,
        html: `
          <div>
            <h2>Password Reset</h2>
            <p>Your password reset OTP is: <strong>${code}</strong></p>
            <p>It expires in ${minutes} minutes.</p>
          </div>
        `,
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  // Add the missing method
  async sendWelcomeEmail(email: string, name: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: email,
        subject: 'Welcome to Our Platform!',
        text: `Hi ${name}, welcome to our platform! Your account has been successfully verified.`,
        html: `
          <div>
            <h2>Welcome to Our Platform!</h2>
            <p>Hi ${name},</p>
            <p>Your account has been successfully verified and you're now ready to start using our platform.</p>
            <p>Thank you for joining us!</p>
          </div>
        `,
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to send welcome email');
    }
  }
}
