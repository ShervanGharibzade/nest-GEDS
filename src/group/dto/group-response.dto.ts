export class GroupMemberResponseDto {
  uuid: string;
  user: { uuid: string; name: string; email: string };
  joinedAt: Date;
}

export class GroupResponseDto {
  uuid: string;
  name: string;
  owner: { uuid: string; name: string; email: string };
  members: GroupMemberResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
