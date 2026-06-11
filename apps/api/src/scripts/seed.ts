import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { Message } from '../database/entities/message.entity';
import { ApiKey } from '../database/entities/api-key.entity';

config({ path: '../../.env' });

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Message, ApiKey],
    // Schema must already exist — run pnpm db:migrate first
    synchronize: false,
    logging: false,
  });

  await ds.initialize();

  const key = 'cs_' + randomBytes(24).toString('hex');
  const keyHash = createHash('sha256').update(key).digest('hex');
  const id = randomBytes(8).toString('hex');

  await ds.getRepository(ApiKey).save({ id, name: 'Default', keyHash, isActive: true });

  console.log('\nAPI Key created:');
  console.log(`\n  ${key}\n`);
  console.log('Add this to your requests:  X-API-Key: <key>\n');

  await ds.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
