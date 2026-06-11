import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES, MessageChannel, MessageJobData, WebhookDeliveryJobData } from '@communication/types';
import { Message } from '../../database/entities/message.entity';

export interface FailedJobView {
  jobId: string;
  messageId: string;
  channel: MessageChannel | 'webhooks';
  to: string;
  subject?: string;
  failedReason: string | null;
  attemptsMade: number;
  failedAt: string | null;
}

@Injectable()
export class DlqService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP) private readonly whatsappQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOKS) private readonly webhookQueue: Queue,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  private queueFor(channel: string): Queue {
    if (channel === 'email') return this.emailQueue;
    if (channel === 'whatsapp') return this.whatsappQueue;
    if (channel === 'webhooks') return this.webhookQueue;
    throw new BadRequestException(`Unknown channel: ${channel}`);
  }

  async listFailed() {
    const [email, whatsapp, webhooks] = await Promise.all([
      this.failedViews(this.emailQueue, 'email'),
      this.failedViews(this.whatsappQueue, 'whatsapp'),
      this.failedWebhookViews(),
    ]);
    return { email, whatsapp, webhooks };
  }

  private async failedViews(queue: Queue, channel: MessageChannel): Promise<FailedJobView[]> {
    const jobs: Job<MessageJobData>[] = await queue.getFailed(0, 99);
    return jobs.map((job) => ({
      jobId: String(job.id),
      messageId: job.data.messageId,
      channel,
      to: job.data.to,
      subject: job.data.subject,
      failedReason: job.failedReason ?? null,
      attemptsMade: job.attemptsMade,
      failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    }));
  }

  private async failedWebhookViews(): Promise<FailedJobView[]> {
    const jobs: Job<WebhookDeliveryJobData>[] = await this.webhookQueue.getFailed(0, 99);
    return jobs.map((job) => ({
      jobId: String(job.id),
      messageId: job.data.payload.messageId,
      channel: 'webhooks',
      to: job.data.url,
      subject: job.data.event,
      failedReason: job.failedReason ?? null,
      attemptsMade: job.attemptsMade,
      failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    }));
  }

  // Webhook jobs don't touch message status — the message itself already
  // reached its final state; only the callback delivery failed.
  private async markRequeued(channel: string, job: Job<any>) {
    if (channel === 'webhooks') return;
    await this.messageRepo.update(job.data.messageId, { status: 'queued', queuedAt: new Date() });
  }

  async retry(channel: string, jobId: string) {
    const queue = this.queueFor(channel);
    const job: Job | undefined = await queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    if (!(await job.isFailed())) throw new BadRequestException('Job is not in failed state');

    await job.retry();
    await this.markRequeued(channel, job);
    return { retried: 1 };
  }

  async retryAll(channel: string) {
    const queue = this.queueFor(channel);
    const jobs: Job[] = await queue.getFailed(0, 999);
    for (const job of jobs) {
      await job.retry();
      await this.markRequeued(channel, job);
    }
    return { retried: jobs.length };
  }

  async discard(channel: string, jobId: string) {
    const queue = this.queueFor(channel);
    const job: Job<MessageJobData> | undefined = await queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    if (!(await job.isFailed())) throw new BadRequestException('Job is not in failed state');

    await job.remove();
    return { discarded: 1 };
  }
}
