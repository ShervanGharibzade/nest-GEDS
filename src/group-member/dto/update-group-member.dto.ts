import { PartialType } from '@nestjs/mapped-types';
import { AddGroupMemberDto } from './create-group-member.dto.js';

export class UpdateGroupMemberDto extends PartialType(AddGroupMemberDto) {}
