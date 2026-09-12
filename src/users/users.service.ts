import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { RegisterUserDto } from '../auth/dto/register-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { LoginUserDto } from '../auth/dto/login-user.dto.js';
import { UserResponse } from './dto/user-response.dto.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.js';
import { User, UserRole } from '../prisma/generated/client.js';
import { AccessTokenService } from '../auth/jwt/access-token.service.js';
import { RefreshTokenService } from '../auth/jwt/refresh-token.service.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly redisService: RedisService,
  ) {}

  async create(registerUserDto: RegisterUserDto): Promise<User> {
    const { email, name, password } = registerUserDto;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw ERROR_MESSAGES.USER.EMAIL_ALREADY_EXISTS();
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.user.create({
      data: { email, name, passwordHash },
    });
  }

  async verify(loginUserDto: LoginUserDto): Promise<UserResponse> {
    const { email, password } = loginUserDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw ERROR_MESSAGES.USER.INVALID_CREDENTIALS();
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw ERROR_MESSAGES.USER.INVALID_CREDENTIALS();
    }

    const accessToken = await this.accessTokenService.generate({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await this.refreshTokenService.generate({
      sub: user.id,
    });

    await this.redisService.setRefreshToken(user.id, refreshToken);

    return { user, refreshToken, accessToken };
  }

  /** ADMIN-only: list every user. */
  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (user === null) {
      throw ERROR_MESSAGES.USER.NOT_FOUND();
    }

    return user;
  }

  /** A user may update only their own account, unless they are ADMIN. */
  async update(
    targetId: number,
    payload: UpdateUserDto,
    requester: { id: number; role: UserRole },
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (user === null) {
      throw ERROR_MESSAGES.USER.NOT_FOUND();
    }

    if (requester.role !== UserRole.ADMIN && requester.id !== targetId) {
      throw new ForbiddenException('You can only update your own account');
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: {
        ...payload,
      },
    });
  }

  /** ADMIN-only: change a user's role. */
  async changeRole(id: number, role: UserRole): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw ERROR_MESSAGES.USER.NOT_FOUND();
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        role,
      },
    });
  }

  /** A user may delete only their own account, unless they are ADMIN. */
  async remove(
    targetId: number,
    requester: { id: number; role: UserRole },
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!user) {
      throw ERROR_MESSAGES.USER.NOT_FOUND();
    }

    if (requester.role !== UserRole.ADMIN && requester.id !== targetId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    await this.prisma.user.delete({
      where: { id: targetId },
    });

    return `User ${targetId} removed successfully`;
  }
}
