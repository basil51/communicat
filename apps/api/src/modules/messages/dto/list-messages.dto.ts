import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel, MessageStatus } from '@communication/types';

export class ListMessagesDto {
  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({ enum: ['scheduled', 'queued', 'processing', 'sent', 'failed', 'delivered'] })
  @IsOptional()
  @IsIn(['scheduled', 'queued', 'processing', 'sent', 'failed', 'delivered'])
  status?: MessageStatus;

  @ApiPropertyOptional({ enum: ['email', 'whatsapp'] })
  @IsOptional()
  @IsIn(['email', 'whatsapp'])
  channel?: MessageChannel;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter to a single bulk-send batch' })
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter to a single tenant' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
