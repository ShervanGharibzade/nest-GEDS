import { Injectable } from '@nestjs/common';
import { CreateExpenseSplitDto } from './dto/create-expense-split.dto.js';
import { UpdateExpenseSplitDto } from './dto/update-expense-split.dto.js';

@Injectable()
export class ExpenseSplitService {
  create(createExpenseSplitDto: CreateExpenseSplitDto) {
    return 'This action adds a new expenseSplit';
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
