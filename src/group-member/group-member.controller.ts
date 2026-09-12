import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupMemberService } from './group-member.service.js';
import { AddGroupMemberDto } from './dto/create-group-member.dto.js';
import {
  GroupMemberResponseDto,
  toGroupMemberResponse,
} from './dto/group-member-response.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('group-member')
@ApiBearerAuth()
@Controller('group-member')
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}

  @Post()
  @ApiOperation({ summary: 'Add a member to a group (owner only)' })
  async add(
    @Body() addGroupMemberDto: AddGroupMemberDto,
    @CurrentUser('id') userId: number,
  ): Promise<GroupMemberResponseDto> {
    const member = await this.groupMemberService.add(
      addGroupMemberDto,
      userId,
    );
    return toGroupMemberResponse(member);
  }

  @Get()
  @ApiOperation({ summary: 'List all group memberships' })
  async findAll(): Promise<GroupMemberResponseDto[]> {
    const members = await this.groupMemberService.findAll();
    return members.map(toGroupMemberResponse);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'List members of a specific group' })
  async findByGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<GroupMemberResponseDto[]> {
    const members = await this.groupMemberService.findByGroup(groupId);
    return members.map(toGroupMemberResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single group membership by id' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GroupMemberResponseDto> {
    const member = await this.groupMemberService.findOne(id);
    return toGroupMemberResponse(member);
  }

  @Delete(':groupId/:userId')
  @ApiOperation({ summary: 'Remove a member from a group (owner only)' })
  async remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('id') requesterId: number,
  ) {
    return this.groupMemberService.remove(groupId, userId, requesterId);
  }
}
