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
    this.refreshTokenTtl = Number(this.configService.getOrThrow<string>('REDIS_REFRESH_TOKEN_TTL'));
  }

  async setRefreshToken(userId: string, token: string): Promise<void> {
    await this.redis.set(
      `refresh_token:${userId}`,
      token,
      'EX',
      this.refreshTokenTtl,
    );
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.redis.get(`refresh_token:${userId}`);
  }

  async ping(): Promise<string> { return this.redis.ping(); }

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
  }
}
