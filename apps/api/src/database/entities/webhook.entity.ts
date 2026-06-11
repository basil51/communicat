import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { WebhookEvent } from '@communication/types';

@Entity('webhooks')
export class Webhook {
  @PrimaryColumn()
  id: string;

  @Column()
  url: string;

  // Stored as comma-separated text: message.sent,message.failed
  @Column({ type: 'simple-array' })
  events: WebhookEvent[];

  // Plaintext on purpose — deliveries are HMAC-signed with it
  @Column()
  secret: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'tenant_id', nullable: true, type: 'varchar' })
  tenantId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
