import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHmac } from 'crypto';
import { QUEUE_NAMES, WebhookDeliveryJobData } from '@communication/types';

const DELIVERY_TIMEOUT_MS = 10_000;

@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  async process(job: Job<WebhookDeliveryJobData>): Promise<void> {
    const { url, secret, event, payload } = job.data;
    const body = JSON.stringify({ event, ...payload });
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-Signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`Webhook delivery failed: HTTP ${res.status}`);
    }
    this.logger.log(`Delivered ${event} to ${url} (message ${payload.messageId})`);
  }
}
