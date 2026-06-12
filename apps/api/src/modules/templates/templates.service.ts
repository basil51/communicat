import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Template } from '../../database/entities/template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TenantScope, tenantIdForCreate, tenantWhere } from '../auth/tenant-scope';

const PLACEHOLDER_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
  ) {}

  // Name uniqueness is per tenant (DB: UQ_templates_tenant_name)
  private async assertNameFree(name: string, tenantId: string | null) {
    const taken = await this.templateRepo.existsBy({ name, tenantId: tenantId ?? IsNull() });
    if (taken) throw new ConflictException(`Template "${name}" already exists`);
  }

  async create(dto: CreateTemplateDto, scope: TenantScope) {
    const tenantId = tenantIdForCreate(scope, dto.tenantId);
    await this.assertNameFree(dto.name, tenantId);
    return this.templateRepo.save(
      this.templateRepo.create({
        id: uuidv4(),
        name: dto.name,
        channel: dto.channel,
        subject: dto.subject ?? null,
        body: dto.body,
        tenantId,
      }),
    );
  }

  findAll(scope: TenantScope) {
    return this.templateRepo.find({ where: tenantWhere(scope), order: { name: 'ASC' } });
  }

  async findOne(id: string, scope: TenantScope) {
    const template = await this.templateRepo.findOne({ where: { id, ...tenantWhere(scope) } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto, scope: TenantScope) {
    const template = await this.findOne(id, scope);
    if (dto.name && dto.name !== template.name) {
      await this.assertNameFree(dto.name, template.tenantId);
    }
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async remove(id: string, scope: TenantScope) {
    const template = await this.findOne(id, scope);
    await this.templateRepo.remove(template);
    return { deleted: true };
  }

  // Strict rendering: every {{placeholder}} in the template must have a value,
  // so a typo'd variable never reaches a customer as literal "{{name}}".
  render(template: Template, variables: Record<string, string> = {}) {
    const missing = new Set<string>();
    const renderString = (text: string) =>
      text.replace(PLACEHOLDER_RE, (_, key: string) => {
        const value = variables[key];
        if (value === undefined) {
          missing.add(key);
          return '';
        }
        return String(value);
      });

    const body = renderString(template.body);
    const subject = template.subject ? renderString(template.subject) : null;

    if (missing.size > 0) {
      throw new BadRequestException(
        `Missing template variable(s): ${[...missing].join(', ')}`,
      );
    }

    return { body, subject };
  }
}
