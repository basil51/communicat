import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES, MessageChannel, MessageJobData } from '@communication/types';
import { Message } from '../../database/entities/message.entity';

export interface FailedJobView {
  jobId: string;
  messageId: string;
  channel: MessageChannel;
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
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  private queueFor(channel: string): Queue {
    if (channel === 'email') return this.emailQueue;
    if (channel === 'whatsapp') return this.whatsappQueue;
    throw new BadRequestException(`Unknown channel: ${channel}`);
  }

  async listFailed() {
    const [email, whatsapp] = await Promise.all([
      this.failedViews(this.emailQueue, 'email'),
      this.failedViews(this.whatsappQueue, 'whatsapp'),
    ]);
    return { email, whatsapp };
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

  async retry(channel: string, jobId: string) {
    const queue = this.queueFor(channel);
    const job: Job<MessageJobData> | undefined = await queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    if (!(await job.isFailed())) throw new BadRequestException('Job is not in failed state');

    await job.retry();
    await this.messageRepo.update(job.data.messageId, { status: 'queued', queuedAt: new Date() });
    return { retried: 1 };
  }

  async retryAll(channel: string) {
    const queue = this.queueFor(channel);
    const jobs: Job<MessageJobData>[] = await queue.getFailed(0, 999);
    for (const job of jobs) {
      await job.retry();
      await this.messageRepo.update(job.data.messageId, { status: 'queued', queuedAt: new Date() });
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
