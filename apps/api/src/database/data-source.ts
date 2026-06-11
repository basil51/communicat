import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Message } from './entities/message.entity';
import { ApiKey } from './entities/api-key.entity';

config({ path: '../../.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Message, ApiKey],
  // Resolves to src/database/migrations/*.ts via ts-node and dist/database/migrations/*.js when compiled
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: ['error'],
});
