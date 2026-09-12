import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GroupService } from './group.service.js';

import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { GroupResponseDto, toGroupResponse } from './dto/group-response.dto.js';
import { GroupBalancesResponseDto } from './dto/group-balances-response.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('group')
@ApiBearerAuth()
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a group (creator becomes owner + member)' })
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentUser('id') userId: number,
  ): Promise<GroupResponseDto> {
    const group = await this.groupService.create(createGroupDto, userId);
    return toGroupResponse(group);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  async findAll(): Promise<GroupResponseDto[]> {
    const groups = await this.groupService.findAll();
    return groups.map(toGroupResponse);
  }

  @Get('my')
  @ApiOperation({ summary: 'List groups the current user owns or belongs to' })
  async myGroups(
    @CurrentUser('id') userId: number,
  ): Promise<GroupResponseDto[]> {
    const groups = await this.groupService.myGroups(userId);
    return groups.map(toGroupResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details with members' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GroupResponseDto> {
    const group = await this.groupService.findOne(id);
    return toGroupResponse(group);
  }

  @Get(':id/balances')
  @ApiOperation({ summary: 'Get who-owes-whom balances for a group' })
  async balances(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<GroupBalancesResponseDto> {
    return this.groupService.getBalances(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a group (owner only)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser('id') userId: number,
  ): Promise<GroupResponseDto> {
    const group = await this.groupService.update(id, updateGroupDto, userId);
    return toGroupResponse(group);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group (owner only)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<GroupResponseDto> {
    const group = await this.groupService.remove(id, userId);
    return toGroupResponse(group);
  }
}
