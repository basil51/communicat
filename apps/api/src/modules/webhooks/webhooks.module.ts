import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from '../../database/entities/webhook.entity';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook]), AuthModule],
  providers: [WebhooksService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
