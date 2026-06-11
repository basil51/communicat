import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ example: 'Hello from Communication Service' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'Welcome!', description: 'Subject (email only)' })
  @IsOptional()
  @IsString()
  subject?: string;
}
