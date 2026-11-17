import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleDestroy,
} from "@nestjs/common";
import Redis from "ioredis";
import { loadEnv } from "../config/env";

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private redis: Redis | null = null;
  private memory = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    try {
      this.redis = new Redis(loadEnv().REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });
      void this.redis.connect().catch(() => {
        this.redis = null;
      });
    } catch {
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  /**
   * Fixed-window limiter. Falls back to in-process memory when Redis is down.
   * Staging/CI safe — never claims edge WAF coverage.
   */
  async consume(key: string, limit: number, windowSeconds: number) {
    const redisKey = `rl:${key}`;
    if (this.redis) {
      try {
        const count = await this.redis.incr(redisKey);
        if (count === 1) await this.redis.expire(redisKey, windowSeconds);
        if (count > limit) {
          throw new HttpException(
            {
              code: "RATE_LIMITED",
              message: "Too many requests — retry later",
              liveWaf: false,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        return { remaining: Math.max(0, limit - count), backend: "redis" as const };
      } catch (err) {
        if (err instanceof HttpException) throw err;
        // fall through to memory
      }
    }

    const now = Date.now();
    const row = this.memory.get(redisKey);
    if (!row || row.resetAt <= now) {
      this.memory.set(redisKey, { count: 1, resetAt: now + windowSeconds * 1000 });
      return { remaining: limit - 1, backend: "memory" as const };
    }
    row.count += 1;
    if (row.count > limit) {
      throw new HttpException(
        {
          code: "RATE_LIMITED",
          message: "Too many requests — retry later",
          liveWaf: false,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return { remaining: Math.max(0, limit - row.count), backend: "memory" as const };
  }
}
