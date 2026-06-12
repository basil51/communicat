import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'eduvibe', description: 'Unique tenant name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
