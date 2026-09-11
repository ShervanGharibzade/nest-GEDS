import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { GroupModule } from './group/group.module.js';
import { GroupMemberModule } from './group-member/group-member.module.js';
import { ExpenseModule } from './expense/expense.module.js';
import { ExpenseSplitModule } from './expense-split/expense-split.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppRedisModule } from './redis/redis.module.js';
import { TransactionModule } from './transaction/transaction.module.js';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        for (const key of ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
          if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
        }
        if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
          throw new Error('JWT secrets must be at least 32 characters');
        }
        return env;
      },
    }),
    PrismaModule,
    AppRedisModule,
    AuthModule,
    UsersModule,
    GroupModule,
    GroupMemberModule,
    ExpenseModule,
    ExpenseSplitModule,
    TransactionModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
