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

@Module({
  imports: [
    UsersModule,
    GroupModule,
    GroupMemberModule,
    ExpenseModule,
    ExpenseSplitModule,
    AppRedisModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
