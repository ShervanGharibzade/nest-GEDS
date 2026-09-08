import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateExpenseSplitDto } from './dto/create-expense-split.dto.js';
import { UpdateExpenseSplitDto } from './dto/update-expense-split.dto.js';
import { waitForDebugger } from 'inspector';
import { PrismaService } from '../prisma/prisma.service.js';
import { totalmem } from 'os';

@Injectable()
export class ExpenseSplitService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createExpenseSplitDto: CreateExpenseSplitDto): Promise<any> {
    const debt =
      createExpenseSplitDto.amount / createExpenseSplitDto.totalMember;

    if (createExpenseSplitDto.totalMember <= 0) {
      throw new ForbiddenException('something wrong');
    }
    if (debt <= 0) {
      throw new ForbiddenException('something wrong');
    }

    const split = await this.prisma.expenseSplit.create({
      data: {
        amount: debt,
        expenseId: createExpenseSplitDto.expenseId,
        userId: createExpenseSplitDto.userId,
      },
    });
  }

  findAll() {
    return `This action returns all expenseSplit`;
  }

  findOne(id: number) {
    return `This action returns a #${id} expenseSplit`;
  }

  update(id: number, updateExpenseSplitDto: UpdateExpenseSplitDto) {
    return `This action updates a #${id} expenseSplit`;
  }

  remove(id: number) {
    return `This action removes a #${id} expenseSplit`;
  }
}
