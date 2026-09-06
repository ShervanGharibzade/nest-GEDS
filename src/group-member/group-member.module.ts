import { Module } from '@nestjs/common';
import { GroupMemberService } from './group-member.service.js';
import { GroupMemberController } from './group-member.controller.js';

@Module({
  controllers: [GroupMemberController],
  providers: [GroupMemberService],
})
export class GroupMemberModule {}
