import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionService } from './transaction.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import {
  TransactionResponseDto,
  toTransactionResponse,
} from './dto/transaction-response.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('transaction')
@ApiBearerAuth()
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({
    summary: 'Pay off your own split for an expense (debtor is always you)',
  })
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser('id') userId: number,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionService.create(
      createTransactionDto,
      userId,
    );
    return toTransactionResponse(transaction);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List transactions you have paid' })
  async myTransactions(
    @CurrentUser('id') userId: number,
  ): Promise<TransactionResponseDto[]> {
    const transactions = await this.transactionService.myTransactions(userId);
    return transactions.map(toTransactionResponse);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Group transaction history (members only)' })
  async groupHistory(
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser('id') userId: number,
  ): Promise<TransactionResponseDto[]> {
    const transactions = await this.transactionService.groupHistory(
      groupId,
      userId,
    );
    return transactions.map(toTransactionResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction you sent or received' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionService.findOne(userId, id);
    return toTransactionResponse(transaction);
  }
}
