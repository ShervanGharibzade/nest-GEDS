import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response as ExpressResponse } from 'express';
import { UsersService } from '../users/users.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { UserMapper, UserResponseDto } from '../users/dto/user-response.dto.js';
import { RESPONSE_MESSAGES } from '../common/constants/response-messages.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly configService: ConfigService,

    private readonly redisService: RedisService,
  ) {}

  async register(data: RegisterUserDto) {
    return this.userService.create(data);
  }

  async login(
    loginDto: LoginUserDto,
    response: ExpressResponse,
  ): Promise<UserResponseDto> {
    const { user, accessToken, refreshToken } =
      await this.userService.verify(loginDto);

    response.cookie(
      'refresh_token',
      refreshToken,
      this.getRefreshCookieOptions(),
    );

    return UserMapper(user, accessToken);
  }

  async signOut(id: number): Promise<string> {
    await this.redisService.deleteRefreshToken(id);
    return RESPONSE_MESSAGES.AUTH.USER_SIGN_OUT_SUCCESSFULLY();
  }

  private getRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      maxAge: this.configService.get<number>(
        'REFRESH_TOKEN_MAX_AGE_MS',
        7 * 24 * 60 * 60 * 1000,
      ),
      path: '/auth/refresh',
    };
  }
}
