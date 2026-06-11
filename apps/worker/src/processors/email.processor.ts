import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUE_NAMES, MessageJobData } from '@communication/types';
import { Message } from '../database/entities/message.entity';
import { EmailService } from '../services/email.service';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<MessageJobData>): Promise<void> {
    const { messageId, to, subject, message } = job.data;
    this.logger.log(`Processing email job ${job.id} → message ${messageId}`);

    await this.messageRepo.update(messageId, { status: 'processing', processingAt: new Date() });

    try {
      await this.emailService.send(to, subject ?? null, message);
      await this.messageRepo.update(messageId, { status: 'sent', sentAt: new Date() });
    } catch (err: any) {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
      await this.messageRepo.update(messageId, {
        status: isLastAttempt ? 'failed' : 'queued',
        retryCount: job.attemptsMade,
        ...(isLastAttempt && { failedAt: new Date(), errorMessage: err.message }),
      });
      throw err;
    }
  }
}
