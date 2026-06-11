import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendBulkDto } from './dto/send-bulk.dto';
import { ListMessagesDto } from './dto/list-messages.dto';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message (returns 202 with message ID)' })
  @ApiResponse({ status: 202, description: 'Message queued' })
  send(@Body() dto: SendMessageDto, @Request() req: any) {
    return this.messagesService.send(dto, req.apiKey?.id);
  }

  @Post('send-bulk')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send to up to 100 recipients in one call (returns 202 with batch ID)' })
  @ApiResponse({ status: 202, description: 'Batch queued' })
  sendBulk(@Body() dto: SendBulkDto, @Request() req: any) {
    return this.messagesService.sendBulk(dto, req.apiKey?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List messages (dashboard, newest first)' })
  list(@Query() query: ListMessagesDto) {
    return this.messagesService.list(query);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get message delivery status' })
  getStatus(@Param('id') id: string) {
    return this.messagesService.getStatus(id);
  }
}
