import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';
import { scopeFromRequest } from '../auth/tenant-scope';
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
  create(@Body() dto: CreateWebhookDto, @Request() req: any) {
    return this.webhooksService.create(dto, scopeFromRequest(req));
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks (API keys see their tenant only)' })
  findAll(@Request() req: any) {
    return this.webhooksService.findAll(scopeFromRequest(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.webhooksService.findOne(id, scopeFromRequest(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook (url, events, isActive)' })
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto, @Request() req: any) {
    return this.webhooksService.update(id, dto, scopeFromRequest(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.webhooksService.remove(id, scopeFromRequest(req));
  }
}
