import {
  Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { DecodeTokenService } from './jwt/decode-token.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { RateLimitGuard } from './guards/rate-limit.guard.js';
import { UseGuards } from '@nestjs/common';
import type { AuthUser } from '../common/types/auth-user.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly decodeToken: DecodeTokenService,
    private readonly redis: RedisService,
  ) {}

  @Post('register')
  @Public()
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a user' })
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and issue access/refresh tokens' })
  login(@Body() dto: LoginUserDto, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(dto, response);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.refresh_token as string | undefined;
    if (!token) throw new UnauthorizedException('Refresh token missing');

    const { id: userUuid } = await this.decodeToken.decodeRefreshToken(token);
    const stored = await this.redis.getRefreshToken(userUuid);
    if (!stored || stored !== token) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return this.authService.refresh(userUuid, response, token);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  signOut(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.signOut(user.sub, response);
  }
}
