import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@communication/types';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }, { name: QUEUE_NAMES.WHATSAPP }),
    AuthModule,
  ],
  providers: [ProvidersService],
  controllers: [ProvidersController],
})
export class ProvidersModule {}
