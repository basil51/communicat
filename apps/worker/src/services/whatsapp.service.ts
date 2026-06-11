import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { QUEUE_NAMES } from '@communication/types';

export type WhatsAppStatus = 'disconnected' | 'qr_required' | 'connected';

const STATUS_KEY = 'whatsapp:status';
const STATUS_TTL_SECONDS = 90;
const HEARTBEAT_MS = 30_000;
const QR_KEY = 'whatsapp:qr';
// whatsapp-web.js rotates the QR roughly every 30s and re-emits 'qr' each time
const QR_TTL_SECONDS = 60;

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private client!: Client;
  private ready = false;
  private status: WhatsAppStatus = 'disconnected';
  private heartbeat?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAMES.WHATSAPP) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.config.get('WHATSAPP_SESSION_PATH', './sessions'),
      }),
      puppeteer: {
        headless: this.config.get('WHATSAPP_HEADLESS', 'true') === 'true',
        executablePath: this.config.get('CHROME_EXECUTABLE_PATH', '/usr/bin/google-chrome'),
        protocolTimeout: 600_000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--no-first-run',
          '--no-zygote',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      this.setStatus('qr_required');
      void this.publishQr(qr);
      this.logger.log('Scan QR code with WhatsApp on your phone:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.setStatus('connected');
      void this.clearQr();
      this.logger.log('WhatsApp client ready');
    });

    this.client.on('auth_failure', (msg) => {
      this.ready = false;
      this.setStatus('disconnected');
      void this.clearQr();
      this.logger.error(`WhatsApp auth failed: ${msg}`);
    });

    this.client.on('disconnected', (reason) => {
      this.ready = false;
      this.setStatus('disconnected');
      void this.clearQr();
      this.logger.warn(`WhatsApp disconnected: ${reason}`);
    });

    this.heartbeat = setInterval(() => this.publishStatus(), HEARTBEAT_MS);

    this.logger.log('Initializing WhatsApp client...');
    this.client.initialize().catch((err: Error) => {
      this.setStatus('disconnected');
      this.logger.error(`WhatsApp failed to initialize: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    const redis = await this.queue.client;
    await redis.del(STATUS_KEY, QR_KEY).catch(() => {});
    await this.client?.destroy().catch(() => {});
  }

  private setStatus(status: WhatsAppStatus) {
    this.status = status;
    void this.publishStatus();
  }

  // The API's ProvidersService reads this key; TTL guards against a dead worker
  // leaving a stale "connected" behind.
  private async publishStatus() {
    try {
      const redis = await this.queue.client;
      await redis.set(STATUS_KEY, this.status, { EX: STATUS_TTL_SECONDS });
    } catch (err: any) {
      this.logger.warn(`Failed to publish WhatsApp status to Redis: ${err.message}`);
    }
  }

  // The API serves this to the dashboard so linking doesn't require terminal access.
  private async publishQr(qr: string) {
    try {
      const redis = await this.queue.client;
      await redis.set(QR_KEY, qr, { EX: QR_TTL_SECONDS });
    } catch (err: any) {
      this.logger.warn(`Failed to publish WhatsApp QR to Redis: ${err.message}`);
    }
  }

  private async clearQr() {
    try {
      const redis = await this.queue.client;
      await redis.del(QR_KEY);
    } catch (err: any) {
      this.logger.warn(`Failed to clear WhatsApp QR from Redis: ${err.message}`);
    }
  }

  getStatus(): WhatsAppStatus {
    return this.status;
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.ready) {
      throw new Error(`WhatsApp not ready (status: ${this.status})`);
    }
    const chatId = to.replace(/\D/g, '') + '@c.us';
    await this.client.sendMessage(chatId, message);
    this.logger.log(`WhatsApp message sent to ${to}`);
  }
}
