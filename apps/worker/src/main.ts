import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule);
  await app.init();
  console.log('Worker is running');

  // puppeteer (via whatsapp-web.js) installs SIGTERM/SIGINT listeners, which
  // disables Node's default exit-on-signal — `nest start --watch` restarts
  // would leave the old worker alive, competing for queue jobs and the
  // WhatsApp session. Exit explicitly, with a deadline in case the WhatsApp
  // client teardown hangs.
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Worker received ${signal}, shutting down`);
    setTimeout(() => process.exit(1), 8000).unref();
    try {
      await app.close();
    } catch {
      // best effort — the deadline above guarantees exit either way
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap();
