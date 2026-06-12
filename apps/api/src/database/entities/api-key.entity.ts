import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { MessageChannel } from '@communication/types';

@Entity('api_keys')
export class ApiKey {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ name: 'key_hash', unique: true })
  keyHash: string;

  @Column({ name: 'tenant_id', nullable: true, type: 'varchar' })
  tenantId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // null = use the API_KEY_RATE_LIMIT_PER_MINUTE env default
  @Column({ name: 'rate_limit_per_minute', type: 'int', nullable: true })
  rateLimitPerMinute: number | null;

  // null = all channels allowed
  @Column({ name: 'allowed_channels', type: 'simple-array', nullable: true })
  allowedChannels: MessageChannel[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_used_at', nullable: true, type: 'timestamptz' })
  lastUsedAt: Date | null;
}
