import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { QUEUE_NAMES, MessageJobData } from '@communication/types';
import { Message } from '../../database/entities/message.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { Template } from '../../database/entities/template.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { SendBulkDto } from './dto/send-bulk.dto';
import { TemplatesService } from '../templates/templates.service';
import { TenantScope } from '../auth/tenant-scope';

const MAX_SCHEDULE_MS = 30 * 24 * 3600 * 1000;

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: false,
} as const;

interface ScheduleInput {
  sendAt?: string;
  delaySeconds?: number;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP) private readonly whatsappQueue: Queue,
    private readonly templatesService: TemplatesService,
  ) {}

  private resolveSchedule(dto: ScheduleInput, now: Date): { delayMs: number; scheduledAt: Date | null } {
    if (dto.sendAt && dto.delaySeconds !== undefined) {
      throw new BadRequestException('Provide either sendAt or delaySeconds, not both');
    }
    if (dto.sendAt) {
      const delayMs = new Date(dto.sendAt).getTime() - now.getTime();
      if (delayMs <= 0) throw new BadRequestException('sendAt must be in the future');
      if (delayMs > MAX_SCHEDULE_MS) throw new BadRequestException('sendAt must be within 30 days');
      return { delayMs, scheduledAt: new Date(dto.sendAt) };
    }
    if (dto.delaySeconds) {
      const delayMs = dto.delaySeconds * 1000;
      return { delayMs, scheduledAt: new Date(now.getTime() + delayMs) };
    }
    return { delayMs: 0, scheduledAt: null };
  }

  // Scoped lookup: a tenant's key can only reach its own templates (404 otherwise)
  private async resolveTemplate(
    dto: { templateId?: string; message?: string; channel: string },
    scope: TenantScope,
  ): Promise<Template | null> {
    if (!dto.templateId) return null;
    if (dto.message) {
      throw new BadRequestException('Provide either message or templateId, not both');
    }
    const template = await this.templatesService.findOne(dto.templateId, scope);
    if (template.channel !== dto.channel) {
      throw new BadRequestException(
        `Template "${template.name}" is for channel "${template.channel}", not "${dto.channel}"`,
      );
    }
    return template;
  }

  private senderScope(apiKey?: ApiKey): TenantScope {
    return { admin: false, tenantId: apiKey?.tenantId ?? null };
  }

  private assertChannelAllowed(apiKey: ApiKey | undefined, channel: string) {
    if (apiKey?.allowedChannels && !apiKey.allowedChannels.includes(channel as any)) {
      throw new ForbiddenException(`This API key may not send on channel "${channel}"`);
    }
  }

  async send(dto: SendMessageDto, apiKey?: ApiKey) {
    this.assertChannelAllowed(apiKey, dto.channel);
    const id = uuidv4();
    const now = new Date();
    const { delayMs, scheduledAt } = this.resolveSchedule(dto, now);
    const template = await this.resolveTemplate(dto, this.senderScope(apiKey));

    let body = dto.message!;
    let subject = dto.subject ?? null;
    if (template) {
      const rendered = this.templatesService.render(template, dto.variables);
      body = rendered.body;
      subject = dto.subject ?? rendered.subject;
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        id,
        channel: dto.channel,
        to: dto.to,
        subject,
        body,
        status: scheduledAt ? 'scheduled' : 'queued',
        apiKeyId: apiKey?.id ?? null,
        tenantId: apiKey?.tenantId ?? null,
        templateId: dto.templateId ?? null,
        scheduledAt,
        queuedAt: scheduledAt ? null : now,
      }),
    );

    const jobData: MessageJobData = {
      messageId: id,
      channel: dto.channel,
      to: dto.to,
      message: body,
      subject: subject ?? undefined,
      tenantId: apiKey?.tenantId ?? undefined,
    };

    const queue = dto.channel === 'email' ? this.emailQueue : this.whatsappQueue;
    await queue.add('send', jobData, { ...JOB_OPTS, ...(delayMs > 0 && { delay: delayMs }) });

    return scheduledAt
      ? { id, status: 'scheduled' as const, scheduledAt }
      : { id, status: 'queued' as const };
  }

  async sendBulk(dto: SendBulkDto, apiKey?: ApiKey) {
    this.assertChannelAllowed(apiKey, dto.channel);
    const now = new Date();
    const { delayMs, scheduledAt } = this.resolveSchedule(dto, now);
    const template = await this.resolveTemplate(dto, this.senderScope(apiKey));

    // Render everything before persisting anything, so one bad recipient
    // fails the whole batch instead of leaving it half-sent.
    const prepared = dto.recipients.map((recipient, i) => {
      let body = dto.message!;
      let subject = dto.subject ?? null;
      if (template) {
        try {
          const rendered = this.templatesService.render(template, {
            ...dto.variables,
            ...recipient.variables,
          });
          body = rendered.body;
          subject = dto.subject ?? rendered.subject;
        } catch (err: any) {
          throw new BadRequestException(`Recipient ${i} (${recipient.to}): ${err?.message ?? err}`);
        }
      }
      return { id: uuidv4(), to: recipient.to, body, subject };
    });

    const batchId = uuidv4();
    const status = scheduledAt ? ('scheduled' as const) : ('queued' as const);

    await this.messageRepo.save(
      prepared.map((p) =>
        this.messageRepo.create({
          id: p.id,
          channel: dto.channel,
          to: p.to,
          subject: p.subject,
          body: p.body,
          status,
          apiKeyId: apiKey?.id ?? null,
          tenantId: apiKey?.tenantId ?? null,
          templateId: dto.templateId ?? null,
          batchId,
          scheduledAt,
          queuedAt: scheduledAt ? null : now,
        }),
      ),
    );

    const queue = dto.channel === 'email' ? this.emailQueue : this.whatsappQueue;
    await queue.addBulk(
      prepared.map((p) => ({
        name: 'send',
        data: {
          messageId: p.id,
          channel: dto.channel,
          to: p.to,
          message: p.body,
          subject: p.subject ?? undefined,
          tenantId: apiKey?.tenantId ?? undefined,
        } satisfies MessageJobData,
        opts: { ...JOB_OPTS, ...(delayMs > 0 && { delay: delayMs }) },
      })),
    );

    return {
      batchId,
      total: prepared.length,
      status,
      ...(scheduledAt && { scheduledAt }),
      messages: prepared.map((p) => ({ id: p.id, to: p.to })),
    };
  }

  async list(query: { limit: number; offset: number; status?: string; channel?: string; batchId?: string; tenantId?: string }) {
    const where: Record<string, string> = {};
    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    if (query.batchId) where.batchId = query.batchId;
    if (query.tenantId) where.tenantId = query.tenantId;

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

  async getStatus(id: string, apiKey?: ApiKey) {
    // A tenant's key only sees its own messages; platform keys see untenanted ones
    const msg = await this.messageRepo.findOne({
      where: { id, tenantId: apiKey?.tenantId ?? IsNull() },
    });
    if (!msg) throw new NotFoundException('Message not found');

    return {
      id: msg.id,
      channel: msg.channel,
      to: msg.to,
      status: msg.status,
      createdAt: msg.createdAt,
      scheduledAt: msg.scheduledAt,
      queuedAt: msg.queuedAt,
      processingAt: msg.processingAt,
      sentAt: msg.sentAt,
      deliveredAt: msg.deliveredAt,
      failedAt: msg.failedAt,
      errorMessage: msg.errorMessage,
    };
  }
}
