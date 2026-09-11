import { IsUUID } from 'class-validator';

export class AddGroupMemberDto {
  @IsUUID()
  groupId: string;

  @IsUUID()
  userId: string;
}
