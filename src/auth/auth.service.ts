import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response as ExpressResponse } from 'express';
import { UsersService } from '../users/users.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UserMapper, UserResponseDto } from '../users/dto/user-response.dto.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(data: RegisterUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(data);
    return UserMapper(user);
  }

  async login(
    dto: LoginUserDto,
    response: ExpressResponse,
  ): Promise<UserResponseDto & { accessToken: string }> {
    const { user, accessToken, refreshToken } =
      await this.usersService.verify(dto);
    this.setRefreshCookie(response, refreshToken);
    return { ...UserMapper(user), accessToken };
  }

  async refresh(userUuid: string, response: ExpressResponse, refreshToken: string) {
    const newRefreshToken = await this.usersService.refresh(userUuid, refreshToken);
    this.setRefreshCookie(response, newRefreshToken.token);
    return { accessToken: newRefreshToken.accessToken };
  }

  async signOut(userUuid: string, response: ExpressResponse): Promise<string> {
    await this.redis.deleteRefreshToken(userUuid);
    this.clearRefreshCookie(response);
    return 'Signed out successfully';
  }

  setRefreshCookie(response: ExpressResponse, token: string) {
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.config.get<number>('REFRESH_TOKEN_MAX_AGE_MS', 7 * 24 * 60 * 60 * 1000),
      path: '/auth/refresh',
    });
  }

  clearRefreshCookie(response: ExpressResponse) {
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }
}
