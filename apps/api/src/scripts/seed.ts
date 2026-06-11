import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { Message } from '../database/entities/message.entity';
import { ApiKey } from '../database/entities/api-key.entity';
import { User } from '../database/entities/user.entity';

config({ path: '../../.env' });

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Message, ApiKey, User],
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

  const userRepo = ds.getRepository(User);
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@sparkco.local').toLowerCase();
  const existing = await userRepo.findOne({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}\n`);
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');
    await userRepo.save({
      id: randomUUID(),
      email,
      name: 'Admin',
      passwordHash: await argon2.hash(password),
      isActive: true,
    });
    console.log('Admin user created:');
    console.log(`\n  email:    ${email}`);
    console.log(`  password: ${password}\n`);
    console.log('Login at POST /api/v1/auth/login\n');
  }

  await ds.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
