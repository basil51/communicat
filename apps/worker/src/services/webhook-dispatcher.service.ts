import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, WebhookDeliveryJobData, WebhookEvent, WebhookEventPayload } from '@communication/types';
import { Webhook } from '../database/entities/webhook.entity';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOKS) private readonly webhookQueue: Queue,
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
  ) {}

  // Fans the event out into one delivery job per subscribed webhook so each
  // endpoint gets its own retries. Never throws — a webhook problem must not
  // fail the message job that triggered it.
  // Tenant isolation: tenant webhooks only get their own tenant's events;
  // global webhooks (tenant_id NULL, admin-created) get everything.
  async dispatch(event: WebhookEvent, payload: Omit<WebhookEventPayload, 'timestamp'>) {
    try {
      const tenantId = payload.tenantId ?? null;
      const hooks = (await this.webhookRepo.findBy({ isActive: true })).filter(
        (h) => h.events.includes(event) && (h.tenantId === null || h.tenantId === tenantId),
      );
      if (hooks.length === 0) return;

      const fullPayload: WebhookEventPayload = { ...payload, timestamp: new Date().toISOString() };
      await this.webhookQueue.addBulk(
        hooks.map((h) => ({
          name: 'deliver',
          data: {
            webhookId: h.id,
            url: h.url,
            secret: h.secret,
            event,
            payload: fullPayload,
          } satisfies WebhookDeliveryJobData,
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: false,
          },
        })),
      );
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch ${event} webhooks: ${err?.message ?? err}`);
    }
  }
}
