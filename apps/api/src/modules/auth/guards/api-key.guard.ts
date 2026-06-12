import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ApiKey } from '../../../database/entities/api-key.entity';
import { Tenant } from '../../../database/entities/tenant.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key: string | undefined = request.headers['x-api-key'];

    if (!key) throw new UnauthorizedException('Missing X-API-Key header');

    const keyHash = createHash('sha256').update(key).digest('hex');
    const apiKey = await this.apiKeyRepo.findOne({ where: { keyHash, isActive: true } });

    if (!apiKey) throw new UnauthorizedException('Invalid API key');

    // Deactivating a tenant must cut off all of its keys at once
    if (apiKey.tenantId) {
      const active = await this.tenantRepo.existsBy({ id: apiKey.tenantId, isActive: true });
      if (!active) throw new UnauthorizedException('Tenant is deactivated');
    }

    this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() }).catch(() => {});
    request.apiKey = apiKey;
    return true;
  }
}
