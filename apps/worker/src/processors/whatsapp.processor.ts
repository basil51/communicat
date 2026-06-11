import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUE_NAMES, MessageJobData } from '@communication/types';
import { Message } from '../database/entities/message.entity';
import { WhatsAppService } from '../services/whatsapp.service';
import { WebhookDispatcherService } from '../services/webhook-dispatcher.service';

@Processor(QUEUE_NAMES.WHATSAPP)
export class WhatsAppProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly whatsappService: WhatsAppService,
    private readonly webhooks: WebhookDispatcherService,
  ) {
    super();
  }

  async process(job: Job<MessageJobData>): Promise<void> {
    const { messageId, to, message } = job.data;
    this.logger.log(`Processing WhatsApp job ${job.id} → message ${messageId}`);

    await this.messageRepo.update(messageId, { status: 'processing', processingAt: new Date() });

    try {
      await this.whatsappService.sendMessage(to, message);
      await this.messageRepo.update(messageId, { status: 'sent', sentAt: new Date() });
      await this.webhooks.dispatch('message.sent', { messageId, channel: 'whatsapp', to, status: 'sent' });
    } catch (err: any) {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
      const errorMessage = err?.message ?? String(err);
      await this.messageRepo.update(messageId, {
        status: isLastAttempt ? 'failed' : 'queued',
        retryCount: job.attemptsMade,
        ...(isLastAttempt && { failedAt: new Date(), errorMessage }),
      });
      if (isLastAttempt) {
        await this.webhooks.dispatch('message.failed', { messageId, channel: 'whatsapp', to, status: 'failed', errorMessage });
      }
      throw err;
    }
  }
}
