import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { MessageChannel } from '@communication/types';

@Entity('templates')
export class Template {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar' })
  channel: MessageChannel;

  @Column({ nullable: true, type: 'varchar' })
  subject: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'tenant_id', nullable: true, type: 'varchar' })
  tenantId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
