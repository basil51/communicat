import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateWebhookDto } from './create-webhook.dto';

// tenantId excluded — webhooks cannot move between tenants
export class UpdateWebhookDto extends PartialType(OmitType(CreateWebhookDto, ['tenantId'] as const)) {}
