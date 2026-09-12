import { User } from '../../prisma/generated/client.js';

export interface UserResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Safe, public-facing shape of a User. Never includes passwordHash.
 * `uuid` is the identifier meant for external/public use; `id` is kept
 * alongside it because the rest of the API is still routed by numeric id.
 */
export class UserResponseDto {
  id: number;
  uuid: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  accessToken?: string;
}

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    uuid: user.uuid,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function UserMapper<T extends User>(
  user: T,
  accessToken: string,
): UserResponseDto {
  return {
    ...toUserResponse(user),
    accessToken,
  };
}
