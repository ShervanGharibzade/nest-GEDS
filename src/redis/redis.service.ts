import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly refreshTokenTtl: number;

  constructor(
    @InjectRedis()
    private readonly redis: Redis,

    private readonly configService: ConfigService,
  ) {
    this.refreshTokenTtl = this.configService.getOrThrow<number>(
      'REDIS_REFRESH_TOKEN_TTL',
    );
  }

  async setRefreshToken(userId: number, token: string): Promise<void> {
    await this.redis.set(
      `refresh_token:${userId}`,
      token,
      'EX',
      this.refreshTokenTtl,
    );
  }

  async getRefreshToken(userId: number): Promise<string | null> {
    return this.redis.get(`refresh_token:${userId}`);
  }

  async deleteRefreshToken(userId: number): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
  }
}
