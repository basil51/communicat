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
