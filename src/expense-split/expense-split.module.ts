import { Module } from '@nestjs/common';
import { ExpenseSplitService } from './expense-split.service.js';
import { ExpenseSplitController } from './expense-split.controller.js';

@Module({
  controllers: [ExpenseSplitController],
  providers: [ExpenseSplitService],
})
export class ExpenseSplitModule {}
