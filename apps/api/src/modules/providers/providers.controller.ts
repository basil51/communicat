import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ProvidersService } from './providers.service';

@ApiTags('providers')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get provider connection status and queue metrics' })
  getStatus() {
    return this.providersService.getStatus();
  }
}
