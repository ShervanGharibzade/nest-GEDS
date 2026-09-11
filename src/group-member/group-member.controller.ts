import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupMemberService } from './group-member.service.js';
import { AddGroupMemberDto } from './dto/create-group-member.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';

@ApiTags('Group Members')
@ApiBearerAuth()
@Controller('groups/:groupUuid/members')
export class GroupMemberController {
  constructor(private readonly members: GroupMemberService) {}

  @Post()
  add(
    @Param('groupUuid', ParseUUIDPipe) groupUuid: string,
    @Body() dto: AddGroupMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (dto.groupId !== groupUuid)
      throw new BadRequestException('groupId does not match route');
    return this.members.add(dto, user.sub);
  }

  @Get()
  findAll(
    @Param('groupUuid', ParseUUIDPipe) groupUuid: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.members.findAll(groupUuid, user.sub);
  }

  @Delete(':userUuid')
  remove(
    @Param('groupUuid', ParseUUIDPipe) groupUuid: string,
    @Param('userUuid', ParseUUIDPipe) userUuid: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.members.remove(groupUuid, userUuid, user.sub);
  }
}
