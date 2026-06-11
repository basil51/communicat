import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Template } from '../../database/entities/template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

const PLACEHOLDER_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
  ) {}

  async create(dto: CreateTemplateDto) {
    if (await this.templateRepo.existsBy({ name: dto.name })) {
      throw new ConflictException(`Template "${dto.name}" already exists`);
    }
    return this.templateRepo.save(
      this.templateRepo.create({
        id: uuidv4(),
        name: dto.name,
        channel: dto.channel,
        subject: dto.subject ?? null,
        body: dto.body,
      }),
    );
  }

  findAll() {
    return this.templateRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const template = await this.findOne(id);
    if (dto.name && dto.name !== template.name && (await this.templateRepo.existsBy({ name: dto.name }))) {
      throw new ConflictException(`Template "${dto.name}" already exists`);
    }
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async remove(id: string) {
    const template = await this.findOne(id);
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
