import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpenseSplitService } from './expense-split.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// Read-only: expense splits are created exclusively by ExpenseService and
// mutated exclusively by TransactionService. See TODO section 7 — public
// create/update/delete endpoints were removed because they could bypass
// expense integrity rules (e.g. arbitrary amounts, double-paying splits).
@ApiTags('expense-split')
@ApiBearerAuth()
@Controller('expense-split')
export class ExpenseSplitController {
  constructor(private readonly expenseSplitService: ExpenseSplitService) {}

  @Get('group/:groupId/mine')
  @ApiOperation({ summary: "Get the current user's splits within a group" })
  findMineForGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.expenseSplitService.findAllSplitsForGroup(groupId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single split (only visible to the debtor or the payer)' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.expenseSplitService.findOne(id, userId);
  }
}
