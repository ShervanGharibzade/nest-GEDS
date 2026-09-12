import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AddGroupMemberDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  groupId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId: number;
}
