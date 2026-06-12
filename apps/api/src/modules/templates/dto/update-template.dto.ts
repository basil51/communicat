import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from './create-template.dto';

// tenantId excluded — templates cannot move between tenants
export class UpdateTemplateDto extends PartialType(OmitType(CreateTemplateDto, ['tenantId'] as const)) {}
