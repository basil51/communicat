import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookEvent } from '@communication/types';

const WEBHOOK_EVENTS: WebhookEvent[] = ['message.sent', 'message.failed'];

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://example.com/hooks/communication', description: 'Callback URL (POSTed with a signed JSON payload)' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({
    enum: WEBHOOK_EVENTS,
    isArray: true,
    description: 'Events to subscribe to (default: all)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events?: WebhookEvent[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
