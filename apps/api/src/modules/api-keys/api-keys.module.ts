import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), TenantsModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
})
export class ApiKeysModule {}
