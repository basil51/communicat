import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@communication/types';
import { Message } from './database/entities/message.entity';
import { Webhook } from './database/entities/webhook.entity';
import { EmailService } from './services/email.service';
import { WhatsAppService } from './services/whatsapp.service';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';
import { EmailProcessor } from './processors/email.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { WebhookProcessor } from './processors/webhook.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Message, Webhook],
        // Schema is owned by the API's migrations; the worker never writes schema
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

    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.WHATSAPP },
      { name: QUEUE_NAMES.WEBHOOKS },
    ),
    TypeOrmModule.forFeature([Message, Webhook]),
  ],
  providers: [
    EmailService,
    WhatsAppService,
    WebhookDispatcherService,
    EmailProcessor,
    WhatsAppProcessor,
    WebhookProcessor,
  ],
})
export class WorkerModule {}
