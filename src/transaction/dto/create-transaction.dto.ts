import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  expenseId: number;

  /**
   * Must equal the caller's outstanding split amount for this expense.
   * The debtor (fromUser) and creditor (toUser/payer) are always derived
   * server-side from the authenticated user and the expense, never from
   * client input.
   */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
