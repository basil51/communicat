import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@communication/types';
import { Message } from '../../database/entities/message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { AuthModule } from '../auth/auth.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }, { name: QUEUE_NAMES.WHATSAPP }),
    AuthModule,
    TemplatesModule,
  ],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}
