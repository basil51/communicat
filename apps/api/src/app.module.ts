import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { Message } from './database/entities/message.entity';
import { ApiKey } from './database/entities/api-key.entity';
import { AuthModule } from './modules/auth/auth.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Message, ApiKey],
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
  ],
})
export class AppModule {}
