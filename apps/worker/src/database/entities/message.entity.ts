import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { MessageChannel, MessageStatus } from '@communication/types';

@Entity('messages')
export class Message {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'varchar' })
  channel: MessageChannel;

  @Column({ name: 'to_address' })
  to: string;

  @Column({ nullable: true, type: 'varchar' })
  subject: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', default: 'queued' })
  status: MessageStatus;

  @Column({ name: 'api_key_id', nullable: true, type: 'varchar' })
  apiKeyId: string | null;

  @Column({ name: 'tenant_id', nullable: true, type: 'varchar' })
  tenantId: string | null;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'queued_at', nullable: true, type: 'timestamptz' })
  queuedAt: Date | null;

  @Column({ name: 'processing_at', nullable: true, type: 'timestamptz' })
  processingAt: Date | null;

  @Column({ name: 'sent_at', nullable: true, type: 'timestamptz' })
  sentAt: Date | null;

  @Column({ name: 'failed_at', nullable: true, type: 'timestamptz' })
  failedAt: Date | null;

  @Column({ name: 'delivered_at', nullable: true, type: 'timestamptz' })
  deliveredAt: Date | null;

  // WhatsApp message id from the provider — the ack handler looks rows up by it
  @Column({ name: 'provider_message_id', nullable: true, type: 'varchar' })
  providerMessageId: string | null;
}
