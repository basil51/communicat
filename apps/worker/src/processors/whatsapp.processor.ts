import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUE_NAMES, MessageJobData } from '@communication/types';
import { Message } from '../database/entities/message.entity';
import { WhatsAppService } from '../services/whatsapp.service';

@Processor(QUEUE_NAMES.WHATSAPP)
export class WhatsAppProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly whatsappService: WhatsAppService,
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
    } catch (err: any) {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
      await this.messageRepo.update(messageId, {
        status: isLastAttempt ? 'failed' : 'queued',
        retryCount: job.attemptsMade,
        ...(isLastAttempt && { failedAt: new Date(), errorMessage: err?.message ?? String(err) }),
      });
      throw err;
    }
  }
}
