export class GroupMemberResponseDto {
  id: number;
  uuid: string;
  groupId: number;
  userId: number;
  name: string;
  email: string;
  joinedAt: Date;
}

type GroupMemberWithUser = {
  id: number;
  uuid: string;
  groupId: number;
  userId: number;
  joinedAt: Date;
  user: { name: string; email: string };
};

export function toGroupMemberResponse(
  member: GroupMemberWithUser,
): GroupMemberResponseDto {
  return {
    id: member.id,
    uuid: member.uuid,
    groupId: member.groupId,
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    joinedAt: member.joinedAt,
  };
}
