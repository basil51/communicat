import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { Message } from './database/entities/message.entity';
import { ApiKey } from './database/entities/api-key.entity';
import { User } from './database/entities/user.entity';
import { Template } from './database/entities/template.entity';
import { Webhook } from './database/entities/webhook.entity';
import { AuthModule } from './modules/auth/auth.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { HealthModule } from './modules/health/health.module';
import { DlqModule } from './modules/dlq/dlq.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Message, ApiKey, User, Template, Webhook],
        // Schema is managed by migrations (pnpm db:migrate); never auto-sync
        synchronize: false,
        logging: ['error'],
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),

    AuthModule,
    MessagesModule,
    ProvidersModule,
    HealthModule,
    DlqModule,
    TemplatesModule,
    WebhooksModule,
  ],
})
export class AppModule {}
