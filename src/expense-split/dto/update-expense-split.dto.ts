import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseSplitDto } from './create-expense-split.dto.js';

export class UpdateExpenseSplitDto extends PartialType(CreateExpenseSplitDto) {}
