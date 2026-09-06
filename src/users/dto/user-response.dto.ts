import { User } from '../../prisma/generated/client.js';

export interface UserResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class UserResponseDto {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  accessToken: string;
  updatedAt: Date;
}

export function UserMapper<T extends User>(
  user: T,
  accessToken: string,
): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accessToken: accessToken,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
