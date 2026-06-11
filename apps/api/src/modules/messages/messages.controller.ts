import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('messages')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message (returns 202 with message ID)' })
  @ApiResponse({ status: 202, description: 'Message queued' })
  send(@Body() dto: SendMessageDto, @Request() req: any) {
    return this.messagesService.send(dto, req.apiKey?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message delivery status' })
  getStatus(@Param('id') id: string) {
    return this.messagesService.getStatus(id);
  }
}
