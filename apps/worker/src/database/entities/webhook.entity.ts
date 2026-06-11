import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { WebhookEvent } from '@communication/types';

// Copy of the API's entity (schema is owned by the API's migrations) —
// like Message, this should move to packages/shared eventually.
@Entity('webhooks')
export class Webhook {
  @PrimaryColumn()
  id: string;

  @Column()
  url: string;

  @Column({ type: 'simple-array' })
  events: WebhookEvent[];

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
