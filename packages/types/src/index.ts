export type MessageChannel = 'email' | 'whatsapp';

export type MessageStatus = 'scheduled' | 'queued' | 'processing' | 'sent' | 'failed' | 'delivered';

export interface SendMessagePayload {
  channel: MessageChannel;
  to: string;
  message: string;
  subject?: string;
}

export interface MessageJobData extends SendMessagePayload {
  messageId: string;
  tenantId?: string;
}

export interface MessageResult {
  id: string;
  status: MessageStatus;
}

export interface MessageStatusResult extends MessageResult {
  channel: MessageChannel;
  to: string;
  createdAt: string;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
}

// message.delivered fires only for WhatsApp (device ack); SMTP cannot report delivery
export type WebhookEvent = 'message.sent' | 'message.failed' | 'message.delivered';

export interface WebhookEventPayload {
  messageId: string;
  channel: MessageChannel;
  to: string;
  status: MessageStatus;
  errorMessage?: string;
  timestamp: string;
}

export interface WebhookDeliveryJobData {
  webhookId: string;
  url: string;
  secret: string;
  event: WebhookEvent;
  payload: WebhookEventPayload;
}

export const QUEUE_NAMES = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  WEBHOOKS: 'webhooks',
} as const;
