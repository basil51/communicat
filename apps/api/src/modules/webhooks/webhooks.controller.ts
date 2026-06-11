import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('webhooks')
@ApiSecurity('api-key')
@ApiBearerAuth()
@UseGuards(ApiKeyOrJwtGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register a webhook (deliveries are HMAC-SHA256 signed with the returned secret)' })
  create(@Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks' })
  findAll() {
    return this.webhooksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook' })
  findOne(@Param('id') id: string) {
    return this.webhooksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook (url, events, isActive)' })
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  remove(@Param('id') id: string) {
    return this.webhooksService.remove(id);
  }
}
