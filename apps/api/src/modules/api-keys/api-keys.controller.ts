import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create an API key — plaintext key is in the response once, only its hash is stored (admin)' })
  create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List API keys (admin)' })
  @ApiQuery({ name: 'tenantId', required: false })
  findAll(@Query('tenantId') tenantId?: string) {
    return this.apiKeysService.findAll(tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an API key — name, isActive, allowedChannels, rateLimitPerMinute (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.apiKeysService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an API key (admin)' })
  remove(@Param('id') id: string) {
    return this.apiKeysService.remove(id);
  }
}
