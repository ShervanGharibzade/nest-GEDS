import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { RegisterUserDto } from '../auth/dto/register-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { LoginUserDto } from '../auth/dto/login-user.dto.js';
import {
  UserMapper,
  UserResponse,
  UserResponseDto,
} from './dto/user-response.dto.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.js';
import { User } from '../prisma/generated/client.js';
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

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users;
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (user === null) {
      throw ERROR_MESSAGES.USER.NOT_FOUND();
    }

    return user;
  }

  async update(id: number, payload: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (user === null) {
      throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND());
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...payload,
      },
    });

    return updatedUser;
  }

  async changeRole(id: number, role: 'ADMIN' | 'USER') {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND());
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: number): Promise<string> {
    if (!id) {
      throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND());
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return `user with this ${id} removed successfully `;
  }
}
