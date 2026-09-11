import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, UseGuards from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ChangeRoleDto } from './dto/change-role.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List users (admin only)' })
  findAll() { return this.users.findAll(); }

  @Get('me')
  me(@CurrentUser() user: AuthUser) { return this.users.findSafeByUuid(user.sub); }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) { return this.users.findSafeByUuid(uuid); }

  @Patch(':uuid')
  update(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthUser) {
    return this.users.update(uuid, dto, user);
  }

  @Patch(':uuid/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  changeRole(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() body: ChangeRoleDto) {
    return this.users.changeRole(uuid, body.role);
  }

  @Delete(':uuid')
  remove(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser() user: AuthUser) {
    return this.users.remove(uuid, user);
  }
}
