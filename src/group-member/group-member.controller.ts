import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { GroupMemberService } from './group-member.service.js';
import { AddGroupMemberDto } from './dto/create-group-member.dto.js';
import { UpdateGroupMemberDto } from './dto/update-group-member.dto.js';
import type { Request } from 'express';
import { DecodeTokenService } from '../auth/jwt/decode-token.service.js';

@Controller('group-member')
export class GroupMemberController {
  constructor(
    private readonly groupMemberService: GroupMemberService,
    private readonly decodeTokenService: DecodeTokenService,
  ) {}

  @Post('/add')
  async add(@Req() req: Request, @Body() addGroupMemberDto: AddGroupMemberDto) {
    const refreshToken = await this.extractRefreshToken(req);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);
    return this.groupMemberService.add(addGroupMemberDto, id);
  }

  @Get()
  findAll() {
    return this.groupMemberService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupMemberService.findOne(+id);
  }

  @Delete(':userId/groupId')
  async remove(
    @Req() req: Request,
    @Param() userId: string,
    @Param() groupId: string,
  ) {
    const refreshToken = await this.extractRefreshToken(req);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    return this.groupMemberService.remove(Number(groupId), Number(userId), id);
  }

  private extractRefreshToken(request: Request): string {
    const token = request.cookies?.['refresh_token'];
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return token;
  }
}
