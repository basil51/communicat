import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProvidersService } from './providers.service';

@ApiTags('providers')
@ApiSecurity('api-key')
@ApiBearerAuth()
@UseGuards(ApiKeyOrJwtGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get provider connection status and queue metrics' })
  getStatus() {
    return this.providersService.getStatus();
  }

  // JWT only (dashboard) — the QR pairs a device to the WhatsApp account,
  // so API-key clients must not be able to fetch it.
  @Get('whatsapp/qr')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current WhatsApp pairing QR (null unless linking is pending)' })
  getWhatsAppQr() {
    return this.providersService.getWhatsAppQr();
  }
}
