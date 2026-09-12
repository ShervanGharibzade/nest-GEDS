import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpenseService } from './expense.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import {
  ExpenseResponseDto,
  toExpenseResponse,
} from './dto/expense-response.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('expense')
@ApiBearerAuth()
@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an expense and automatically split it among the group',
  })
  async create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser('id') userId: number,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expenseService.create(
      createExpenseDto,
      userId,
    );
    return toExpenseResponse(expense);
  }

  @Get()
  @ApiOperation({
    summary: 'List expenses for a group (group members only)',
  })
  async findAllForGroup(
    @Query('groupId', ParseIntPipe) groupId: number,
    @CurrentUser('id') userId: number,
  ): Promise<ExpenseResponseDto[]> {
    const expenses = await this.expenseService.findAllForGroup(
      groupId,
      userId,
    );
    return expenses.map(toExpenseResponse);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an expense with payer and splits (group members only)',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expenseService.findOne(id, userId);
    return toExpenseResponse(expense);
  }
}
