import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  groupId: number;

  /**
   * Smallest currency unit (e.g. cents), as a positive integer. Converted
   * to BigInt before being persisted since Expense.amount is BigInt.
   */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;
}
