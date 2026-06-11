import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@communication/types';

export class BulkRecipientDto {
  @ApiProperty({ example: 'user@example.com', description: 'Recipient — email address or phone number (+country-code)' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({
    example: { name: 'Basel' },
    description: 'Per-recipient template variables (merged over the top-level variables)',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class SendBulkDto {
  @ApiProperty({ enum: ['email', 'whatsapp'], description: 'Delivery channel' })
  @IsEnum(['email', 'whatsapp'])
  channel: MessageChannel;

  @ApiProperty({ type: [BulkRecipientDto], description: 'Recipients (max 100 per call)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkRecipientDto)
  recipients: BulkRecipientDto[];

  @ApiPropertyOptional({ example: 'Hello everyone', description: 'Message body (required unless templateId is provided)' })
  @ValidateIf((o) => !o.templateId)
  @IsString()
  @IsNotEmpty()
  message?: string;

  @ApiPropertyOptional({ example: 'Welcome!', description: 'Subject (email only; overrides the template subject)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Send a stored template instead of a literal message' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    example: { orderId: 'SO-1042' },
    description: 'Shared values for the {{placeholders}} in the template (per-recipient variables take precedence)',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({
    example: '2026-06-15T09:00:00+03:00',
    description: 'Schedule delivery at a specific datetime (ISO 8601, max 30 days ahead)',
  })
  @IsOptional()
  @IsISO8601()
  sendAt?: string;

  @ApiPropertyOptional({ example: 1800, description: 'Delay delivery by this many seconds (max 30 days)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30 * 24 * 3600)
  delaySeconds?: number;
}
