import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { Webhook } from '../../database/entities/webhook.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
  ) {}

  create(dto: CreateWebhookDto) {
    return this.webhookRepo.save(
      this.webhookRepo.create({
        id: randomUUID(),
        url: dto.url,
        events: dto.events ?? ['message.sent', 'message.failed'],
        secret: 'whsec_' + randomBytes(24).toString('hex'),
        isActive: dto.isActive ?? true,
      }),
    );
  }

  findAll() {
    return this.webhookRepo.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: string) {
    const webhook = await this.webhookRepo.findOne({ where: { id } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  async update(id: string, dto: UpdateWebhookDto) {
    const webhook = await this.findOne(id);
    Object.assign(webhook, dto);
    return this.webhookRepo.save(webhook);
  }

  async remove(id: string) {
    const webhook = await this.findOne(id);
    await this.webhookRepo.remove(webhook);
    return { deleted: true };
  }
}
