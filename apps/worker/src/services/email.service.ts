import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: config.get('SMTP_SECURE') === 'true',
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async send(to: string, subject: string | null, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to,
      subject: subject ?? '(No Subject)',
      text: body,
    });
    this.logger.log(`Email sent to ${to}`);
  }
}
