import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupMemberDto } from './create-group-member.dto.js';

export class UpdateGroupMemberDto extends PartialType(CreateGroupMemberDto) {}
