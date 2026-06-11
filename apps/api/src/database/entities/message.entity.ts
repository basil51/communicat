import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
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

  @Index()
  @Column({ type: 'varchar', default: 'queued' })
  status: MessageStatus;

  @Column({ name: 'api_key_id', nullable: true, type: 'varchar' })
  apiKeyId: string | null;

  @Column({ name: 'tenant_id', nullable: true, type: 'varchar' })
  tenantId: string | null;

  @Column({ name: 'template_id', nullable: true, type: 'varchar' })
  templateId: string | null;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage: string | null;

  @Index()
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
}
