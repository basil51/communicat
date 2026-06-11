export type MessageChannel = 'email' | 'whatsapp';

export type MessageStatus = 'queued' | 'processing' | 'sent' | 'failed' | 'delivered';

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

export const QUEUE_NAMES = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
} as const;
