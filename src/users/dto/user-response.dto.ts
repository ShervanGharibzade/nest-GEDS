import { User } from '../../prisma/generated/client.js';

export class UserResponseDto {
  uuid: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export function UserMapper(user: User): UserResponseDto {
  return {
    uuid: user.uuid,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
