import { ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@communication/types';

const CHANNELS: MessageChannel[] = ['email', 'whatsapp'];

export class CreateApiKeyDto {
  @ApiProperty({ example: 'eduvibe-production' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Tenant this key belongs to (omit for a platform-level key)' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ enum: CHANNELS, isArray: true, description: 'Channels the key may send on (default: all)' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CHANNELS, { each: true })
  allowedChannels?: MessageChannel[];

  @ApiPropertyOptional({ description: 'Messages per minute (omit for the env default)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;
}
