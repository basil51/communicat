import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ApiKey } from '../../../database/entities/api-key.entity';
import { Tenant } from '../../../database/entities/tenant.entity';
import type { JwtPayload } from '../auth.service';

/** Accepts either a dashboard JWT (Authorization: Bearer) or an integration API key (X-API-Key). */
@Injectable()
export class ApiKeyOrJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const header: string | undefined = request.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) {
      try {
        request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    const key: string | undefined = request.headers['x-api-key'];
    if (key) {
      const keyHash = createHash('sha256').update(key).digest('hex');
      const apiKey = await this.apiKeyRepo.findOne({ where: { keyHash, isActive: true } });
      if (!apiKey) throw new UnauthorizedException('Invalid API key');
      if (apiKey.tenantId) {
        const active = await this.tenantRepo.existsBy({ id: apiKey.tenantId, isActive: true });
        if (!active) throw new UnauthorizedException('Tenant is deactivated');
      }
      this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() }).catch(() => {});
      request.apiKey = apiKey;
      return true;
    }

    throw new UnauthorizedException('Provide a Bearer token or X-API-Key header');
  }
}
