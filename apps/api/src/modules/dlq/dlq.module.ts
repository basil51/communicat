import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@communication/types';
import { Message } from '../../database/entities/message.entity';
import { AuthModule } from '../auth/auth.module';
import { DlqService } from './dlq.service';
import { DlqController } from './dlq.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }, { name: QUEUE_NAMES.WHATSAPP }),
    AuthModule,
  ],
  providers: [DlqService],
  controllers: [DlqController],
})
export class DlqModule {}
