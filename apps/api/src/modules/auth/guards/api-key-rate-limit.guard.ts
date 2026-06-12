import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@communication/types';
import { ApiKey } from '../../../database/entities/api-key.entity';

const WINDOW_SECONDS = 60;

// BullMQ's IRedisClient type only declares the commands BullMQ itself uses;
// its runtime proxy forwards everything else to the raw ioredis client.
interface RedisCounter {
  incrby(key: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

/**
 * Per-key message budget: fixed one-minute Redis window keyed by API key id.
 * Must run after ApiKeyGuard (reads request.apiKey). The limit counts
 * messages, not requests — a bulk send costs its recipient count.
 */
@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey: ApiKey | undefined = request.apiKey;
    if (!apiKey) return true;

    const limit =
      apiKey.rateLimitPerMinute ??
      parseInt(this.config.get('API_KEY_RATE_LIMIT_PER_MINUTE', '60'), 10);

    // Guards run before validation pipes, so the body is unvalidated here;
    // the DTO caps recipients at 100 later — clamp so a bogus body can't
    // drain the whole budget.
    const recipients = Array.isArray(request.body?.recipients)
      ? request.body.recipients.length
      : 0;
    const cost = Math.min(Math.max(recipients, 1), 100);

    const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
    const redisKey = `ratelimit:${apiKey.id}:${window}`;
    const redis = (await this.emailQueue.client) as unknown as RedisCounter;
    const count = await redis.incrby(redisKey, cost);
    if (count === cost) await redis.expire(redisKey, WINDOW_SECONDS * 2);

    if (count > limit) {
      const retryAfter = WINDOW_SECONDS - Math.floor((Date.now() / 1000) % WINDOW_SECONDS);
      context.switchToHttp().getResponse().header('Retry-After', String(retryAfter));
      throw new HttpException(
        `API key rate limit exceeded (${limit} messages/minute)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
