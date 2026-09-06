import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ExpenseSplitService } from './expense-split.service.js';
import { CreateExpenseSplitDto } from './dto/create-expense-split.dto.js';
import { UpdateExpenseSplitDto } from './dto/update-expense-split.dto.js';

@Controller('expense-split')
export class ExpenseSplitController {
  constructor(private readonly expenseSplitService: ExpenseSplitService) {}

  @Post()
  create(@Body() createExpenseSplitDto: CreateExpenseSplitDto) {
    return this.expenseSplitService.create(createExpenseSplitDto);
  }

  @Get()
  findAll() {
    return this.expenseSplitService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseSplitService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpenseSplitDto: UpdateExpenseSplitDto) {
    return this.expenseSplitService.update(+id, updateExpenseSplitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseSplitService.remove(+id);
  }
}
