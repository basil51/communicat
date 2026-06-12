import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { Webhook } from '../../database/entities/webhook.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { TenantScope, tenantIdForCreate, tenantWhere } from '../auth/tenant-scope';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
  ) {}

  create(dto: CreateWebhookDto, scope: TenantScope) {
    return this.webhookRepo.save(
      this.webhookRepo.create({
        id: randomUUID(),
        url: dto.url,
        events: dto.events ?? ['message.sent', 'message.failed', 'message.delivered'],
        secret: 'whsec_' + randomBytes(24).toString('hex'),
        isActive: dto.isActive ?? true,
        tenantId: tenantIdForCreate(scope, dto.tenantId),
      }),
    );
  }

  findAll(scope: TenantScope) {
    return this.webhookRepo.find({ where: tenantWhere(scope), order: { createdAt: 'ASC' } });
  }

  async findOne(id: string, scope: TenantScope) {
    const webhook = await this.webhookRepo.findOne({ where: { id, ...tenantWhere(scope) } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  async update(id: string, dto: UpdateWebhookDto, scope: TenantScope) {
    const webhook = await this.findOne(id, scope);
    Object.assign(webhook, dto);
    return this.webhookRepo.save(webhook);
  }

  async remove(id: string, scope: TenantScope) {
    const webhook = await this.findOne(id, scope);
    await this.webhookRepo.remove(webhook);
    return { deleted: true };
  }
}
