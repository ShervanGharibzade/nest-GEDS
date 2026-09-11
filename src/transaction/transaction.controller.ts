import { Body, Controller, Get, Param, Post, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionService } from './transaction.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Post()
  pay(@Body() dto: CreateTransactionDto, @CurrentUser() user: AuthUser) {
    return this.transactions.create(dto, user.sub);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.transactions.myTransactions(user.sub);
  }

  @Get('group/:groupUuid')
  groupHistory(@Param('groupUuid', ParseUUIDPipe) groupUuid: string, @CurrentUser() user: AuthUser) {
    return this.transactions.groupHistory(groupUuid, user.sub);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser() user: AuthUser) {
    return this.transactions.findOne(uuid, user.sub);
  }
}
