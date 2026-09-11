import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @IsUUID()
  groupId: string;

  @Transform(({ value }) => String(value))
  @Matches(/^[1-9]\d*$/, { message: 'amount must be a positive integer amount in the smallest currency unit' })
  amount: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;
}
