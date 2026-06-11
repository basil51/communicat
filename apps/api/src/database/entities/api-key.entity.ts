import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_used_at', nullable: true, type: 'timestamptz' })
  lastUsedAt: Date | null;
}
