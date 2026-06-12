import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'eduvibe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Deactivating a tenant blocks all of its API keys' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
