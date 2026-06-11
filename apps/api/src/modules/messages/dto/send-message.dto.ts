import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@communication/types';

export class SendMessageDto {
  @ApiProperty({ enum: ['email', 'whatsapp'], description: 'Delivery channel' })
  @IsEnum(['email', 'whatsapp'])
  channel: MessageChannel;

  @ApiProperty({ example: 'user@example.com', description: 'Recipient — email address or phone number (+country-code)' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({ example: 'Hello from Communication Service', description: 'Message body (required unless templateId is provided)' })
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
    example: { name: 'Basel', orderId: 'SO-1042' },
    description: 'Values for the {{placeholders}} in the template',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
