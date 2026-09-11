import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches, MaxLength, IsOptional } from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  expenseId: string;

  @Transform(({ value }) => String(value))
  @Matches(/^[1-9]\d*$/, { message: 'amount must be a positive integer amount in the smallest currency unit' })
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
