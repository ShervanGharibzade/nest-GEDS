export class GroupMemberSummaryDto {
  id: number;
  uuid: string;
  name: string;
  email: string;
  joinedAt: Date;
}

export class GroupResponseDto {
  id: number;
  uuid: string;
  name: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  members?: GroupMemberSummaryDto[];
}

type GroupWithOptionalMembers = {
  id: number;
  uuid: string;
  name: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  members?: {
    id: number;
    uuid: string;
    joinedAt: Date;
    user: { id: number; name: string; email: string };
  }[];
};

export function toGroupResponse(
  group: GroupWithOptionalMembers,
): GroupResponseDto {
  return {
    id: group.id,
    uuid: group.uuid,
    name: group.name,
    ownerId: group.ownerId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: group.members?.map((m) => ({
      id: m.user.id,
      uuid: m.uuid,
      name: m.user.name,
      email: m.user.email,
      joinedAt: m.joinedAt,
    })),
  };
}
