import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@communication/types';

export class CreateTemplateDto {
  @ApiProperty({ example: 'order-confirmation', description: 'Unique template name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: ['email', 'whatsapp'], description: 'Channel this template is for' })
  @IsEnum(['email', 'whatsapp'])
  channel: MessageChannel;

  @ApiProperty({
    example: 'Hi {{name}}, your order {{orderId}} has shipped.',
    description: 'Message body — placeholders use {{variable}} syntax',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: 'Order {{orderId}} shipped', description: 'Subject (email templates only, supports placeholders)' })
  @IsOptional()
  @IsString()
  subject?: string;
}
