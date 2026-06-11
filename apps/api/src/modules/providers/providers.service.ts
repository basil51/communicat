import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { QUEUE_NAMES } from '@communication/types';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP) private readonly whatsappQueue: Queue,
  ) {}

  async getStatus() {
    const [emailCheck, emailCounts, whatsappCounts, whatsappStatus] = await Promise.all([
      this.checkSmtp(),
      this.emailQueue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
      this.whatsappQueue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
      this.getWhatsAppStatus(),
    ]);

    return {
      email: {
        connected: emailCheck.ok,
        error: emailCheck.error ?? null,
        queue: emailCounts,
      },
      whatsapp: {
        status: whatsappStatus,
        queue: whatsappCounts,
      },
    };
  }

  private async checkSmtp(): Promise<{ ok: boolean; error?: string }> {
    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });

    try {
      await transporter.verify();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    } finally {
      transporter.close();
    }
  }

  private async getWhatsAppStatus(): Promise<string> {
    try {
      // Worker writes its connection status here every 30s
      const redis = await this.emailQueue.client;
      return (await redis.get('whatsapp:status')) ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
