import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ChangeUserRoleDto } from './dto/change-user-role.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { toUserResponse, UserResponseDto } from './dto/user-response.dto.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all users (admin only)' })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(toUserResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    return toUserResponse(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user (self or admin only)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto, requester);
    return toUserResponse(user);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Change a user's role (admin only)" })
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: ChangeUserRoleDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.changeRole(id, payload.role);
    return toUserResponse(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user (self or admin only)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<string> {
    return this.usersService.remove(id, requester);
  }
}
