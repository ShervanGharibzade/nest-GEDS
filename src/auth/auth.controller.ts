import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { AuthService } from './auth.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { RESPONSE_MESSAGES } from '../common/constants/response-messages.js';
import { DecodeTokenService } from './jwt/decode-token.service.js';
import { AccessTokenService } from './jwt/access-token.service.js';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis.service.js';
import { RefreshResponseDto } from './dto/refresh-response-dto.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly decodeTokenService: DecodeTokenService,
    private readonly accessTokenService: AccessTokenService,
    private readonly userService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() data: RegisterUserDto): Promise<string> {
    const user = await this.authService.register(data);
    return RESPONSE_MESSAGES.AUTH.USER_REGISTRY_SUCCESSFULLY(user.email);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and issue tokens' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginUserDto,
    @Res({ passthrough: true }) response: ExpressResponse,
  ): Promise<UserResponseDto> {
    return this.authService.login(loginDto, response);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue a new access token using a valid refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed',
    type: RefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ): Promise<RefreshResponseDto> {
    const refreshToken = this.extractRefreshToken(request);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    const storedToken = await this.redisService.getRefreshToken(id);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.userService.findOne(id);

    const accessToken = await this.accessTokenService.generate({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign out the current user and revoke their refresh token',
  })
  @ApiResponse({ status: 200, description: 'Signed out successfully' })
  async signOut(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ): Promise<string> {
    const refreshToken = this.extractRefreshToken(request);

    const { id } =
      await this.decodeTokenService.decodeRefreshToken(refreshToken);

    const result = await this.authService.signOut(id);

    response.clearCookie('refresh_token', { path: '/auth/refresh' });

    return result;
  }

  private extractRefreshToken(request: ExpressRequest): string {
    const token = request.cookies?.['refresh_token'];
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return token;
  }
}
