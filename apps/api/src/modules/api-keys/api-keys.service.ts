import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from '../../database/entities/api-key.entity';
import { TenantsService } from '../tenants/tenants.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    private readonly tenantsService: TenantsService,
  ) {}

  private toResponse(key: ApiKey) {
    // Never expose keyHash
    return {
      id: key.id,
      name: key.name,
      tenantId: key.tenantId,
      isActive: key.isActive,
      allowedChannels: key.allowedChannels,
      rateLimitPerMinute: key.rateLimitPerMinute,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    };
  }

  async create(dto: CreateApiKeyDto) {
    if (dto.tenantId) {
      const tenant = await this.tenantsService.findOne(dto.tenantId);
      if (!tenant.isActive) throw new BadRequestException('Tenant is deactivated');
    }

    const key = 'cs_' + randomBytes(24).toString('hex');
    const saved = await this.apiKeyRepo.save(
      this.apiKeyRepo.create({
        id: randomBytes(8).toString('hex'),
        name: dto.name,
        keyHash: createHash('sha256').update(key).digest('hex'),
        tenantId: dto.tenantId ?? null,
        isActive: true,
        allowedChannels: dto.allowedChannels ?? null,
        rateLimitPerMinute: dto.rateLimitPerMinute ?? null,
      }),
    );

    // Plaintext key is returned exactly once — only the hash is stored
    return { ...this.toResponse(saved), key };
  }

  async findAll(tenantId?: string) {
    const keys = await this.apiKeyRepo.find({
      where: tenantId ? { tenantId } : {},
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => this.toResponse(k));
  }

  async findOne(id: string) {
    const key = await this.apiKeyRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');
    return key;
  }

  async update(id: string, dto: UpdateApiKeyDto) {
    const key = await this.findOne(id);
    Object.assign(key, dto);
    return this.toResponse(await this.apiKeyRepo.save(key));
  }

  async remove(id: string) {
    const key = await this.findOne(id);
    await this.apiKeyRepo.remove(key);
    return { deleted: true };
  }
}
