import { IsEnum } from 'class-validator';
import { UserRole } from '../../prisma/generated/enums.js';

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
