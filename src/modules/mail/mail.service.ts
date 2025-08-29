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

  async sendResetPasswordOtp(email: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: email,
        subject: 'Your Password Reset Otp',
        text: `Your password reset otp is: ${code}\n\nIt expires in ${this.config.get('OTP_TTL_MINUTES')} minutes.`,
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
