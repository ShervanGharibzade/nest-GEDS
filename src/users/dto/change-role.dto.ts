import { IsEnum } from 'class-validator';

export enum ChangeRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export class ChangeRoleDto {
  @IsEnum(ChangeRole)
  role: ChangeRole;
}
