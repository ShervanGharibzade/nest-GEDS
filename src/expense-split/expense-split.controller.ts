import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpenseSplitService } from './expense-split.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';

@ApiTags('Expense Splits')
@ApiBearerAuth()
@Controller('groups/:groupUuid/splits')
export class ExpenseSplitController {
  constructor(private readonly splits: ExpenseSplitService) {}

  @Get('mine')
  mine(@Param('groupUuid', ParseUUIDPipe) groupUuid: string, @CurrentUser() user: AuthUser) {
    return this.splits.mine(groupUuid, user.sub);
  }
}
