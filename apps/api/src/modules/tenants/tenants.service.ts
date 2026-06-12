import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Tenant } from '../../database/entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto) {
    if (await this.tenantRepo.existsBy({ name: dto.name })) {
      throw new ConflictException(`Tenant "${dto.name}" already exists`);
    }
    return this.tenantRepo.save(
      this.tenantRepo.create({ id: randomUUID(), name: dto.name, isActive: true }),
    );
  }

  findAll() {
    return this.tenantRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    if (dto.name && dto.name !== tenant.name && (await this.tenantRepo.existsBy({ name: dto.name }))) {
      throw new ConflictException(`Tenant "${dto.name}" already exists`);
    }
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);
    try {
      await this.tenantRepo.remove(tenant);
    } catch (err: any) {
      // 23503 = foreign_key_violation: API keys / templates / webhooks still reference it
      if (err?.driverError?.code === '23503' || err?.code === '23503') {
        throw new ConflictException(
          'Tenant still has API keys, templates or webhooks — delete those first or deactivate the tenant instead',
        );
      }
      throw err;
    }
    return { deleted: true };
  }
}
