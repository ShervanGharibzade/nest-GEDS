import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.getOrThrow<string>('REDIS_URL'),
      }),
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class AppRedisModule {}
