import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { QUEUE_NAMES, MessageJobData } from '@communication/types';
import { Message } from '../../database/entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP) private readonly whatsappQueue: Queue,
  ) {}

  async send(dto: SendMessageDto, apiKeyId?: string) {
    const id = uuidv4();
    const now = new Date();

    await this.messageRepo.save(
      this.messageRepo.create({
        id,
        channel: dto.channel,
        to: dto.to,
        subject: dto.subject ?? null,
        body: dto.message,
        status: 'queued',
        apiKeyId: apiKeyId ?? null,
        queuedAt: now,
      }),
    );

    const jobData: MessageJobData = {
      messageId: id,
      channel: dto.channel,
      to: dto.to,
      message: dto.message,
      subject: dto.subject,
    };

    const queue = dto.channel === 'email' ? this.emailQueue : this.whatsappQueue;
    await queue.add('send', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    });

    return { id, status: 'queued' as const };
  }

  async list(query: { limit: number; offset: number; status?: string; channel?: string }) {
    const where: Record<string, string> = {};
    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;

    const [items, total] = await this.messageRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      items: items.map((m) => ({
        id: m.id,
        channel: m.channel,
        to: m.to,
        subject: m.subject,
        status: m.status,
        errorMessage: m.errorMessage,
        retryCount: m.retryCount,
        createdAt: m.createdAt,
        sentAt: m.sentAt,
        failedAt: m.failedAt,
      })),
    };
  }

  async getStatus(id: string) {
    const msg = await this.messageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');

    return {
      id: msg.id,
      channel: msg.channel,
      to: msg.to,
      status: msg.status,
      createdAt: msg.createdAt,
      queuedAt: msg.queuedAt,
      processingAt: msg.processingAt,
      sentAt: msg.sentAt,
      failedAt: msg.failedAt,
      errorMessage: msg.errorMessage,
    };
  }
}
