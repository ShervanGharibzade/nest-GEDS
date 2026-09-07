import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { GroupService } from './group.service.js';

import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { DecodeTokenService } from '../auth/jwt/decode-token.service.js';

@Controller('group')
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly decodeTokenService: DecodeTokenService,
  ) {}

  @Post()
  async create(@Body() createGroupDto: CreateGroupDto, @Req() req: Request) {
    const refreshToken = this.extractRefreshToken(req);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    return this.groupService.create(createGroupDto, id);
  }

  @Get()
  @UseGuards(RolesGuard)
  findAll() {
    return this.groupService.findAll();
  }

  @Get('my')
  async myGroups(@Req() req: Request) {
    const refreshToken = this.extractRefreshToken(req);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    return this.groupService.myGroups(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) reqId: number,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() req: Request,
  ) {
    const refreshToken = this.extractRefreshToken(req);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    return this.groupService.update(reqId, updateGroupDto, id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) reqId: number, @Req() req: Request) {
    const refreshToken = this.extractRefreshToken(req);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    return this.groupService.remove(reqId, id);
  }

  private extractRefreshToken(request: Request): string {
    const token = request.cookies?.['refresh_token'];
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return token;
  }
}
