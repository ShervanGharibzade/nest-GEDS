import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { UsersModule } from './users/users.module.js';
import { GroupModule } from './group/group.module.js';
import { GroupMemberModule } from './group-member/group-member.module.js';
import { ExpenseModule } from './expense/expense.module.js';
import { ExpenseSplitModule } from './expense-split/expense-split.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppRedisModule } from './redis/redis.module.js';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TrnasactionModule } from './trnasaction/trnasaction.module.js';
import { TransactionModule } from './transaction/transaction.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    PrismaModule,
    GroupModule,
    GroupMemberModule,
    ExpenseModule,
    ExpenseSplitModule,
    AppRedisModule,
    AuthModule,
    TrnasactionModule,
    TransactionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
