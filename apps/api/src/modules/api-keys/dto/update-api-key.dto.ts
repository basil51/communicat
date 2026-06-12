import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@communication/types';

const CHANNELS: MessageChannel[] = ['email', 'whatsapp'];

export class UpdateApiKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: CHANNELS, isArray: true, nullable: true, description: 'null = all channels' })
  @ValidateIf((o) => o.allowedChannels !== null)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CHANNELS, { each: true })
  allowedChannels?: MessageChannel[] | null;

  @ApiPropertyOptional({ nullable: true, description: 'null = env default' })
  @ValidateIf((o) => o.rateLimitPerMinute !== null)
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number | null;
}
