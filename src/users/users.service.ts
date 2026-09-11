import {
  ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterUserDto } from '../auth/dto/register-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { LoginUserDto } from '../auth/dto/login-user.dto.js';
import { AccessTokenService } from '../auth/jwt/access-token.service.js';
import { RefreshTokenService } from '../auth/jwt/refresh-token.service.js';
import { RedisService } from '../redis/redis.service.js';
import { UserMapper, UserResponseDto } from './dto/user-response.dto.js';
import type { User, Prisma } from '../prisma/generated/client.js';

const SAFE_USER_SELECT = {
  uuid: true, email: true, name: true, role: true, createdAt: true, updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: RegisterUserDto): Promise<User> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already exists');

    return this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash: await bcrypt.hash(dto.password, 12),
      },
    });
  }

  async verify(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new ForbiddenException('Invalid email or password');
    }

    const accessToken = await this.accessTokens.generate({
      sub: user.uuid, email: user.email, role: user.role,
    });
    const refreshToken = await this.refreshTokens.generate({ sub: user.uuid });
    await this.redis.setRefreshToken(user.uuid, refreshToken);

    return { user, refreshToken, accessToken };
  }

  async refresh(uuid: string, refreshToken: string) {
    const user = await this.findByUuid(uuid);
    const payload = await this.refreshTokens.verify<{ sub: string }>(refreshToken);
    if (payload.sub !== uuid) throw new ForbiddenException('Invalid refresh token');

    const accessToken = await this.accessTokens.generate({
      sub: user.uuid, email: user.email, role: user.role,
    });
    const nextRefreshToken = await this.refreshTokens.generate({ sub: user.uuid });
    await this.redis.setRefreshToken(user.uuid, nextRefreshToken);

    return { accessToken, token: nextRefreshToken };
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  async findByUuid(uuid: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { uuid } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findSafeByUuid(uuid: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { uuid }, select: SAFE_USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(uuid: string, dto: UpdateUserDto, requester: { sub: string; role: 'USER'|'ADMIN' }) {
    if (requester.role !== 'ADMIN' && requester.sub !== uuid) {
      throw new ForbiddenException('You can update only your own account');
    }
    const existing = await this.findByUuid(uuid);
    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.password !== undefined) data.passwordHash = await bcrypt.hash(dto.password, 12);

    if (data.email && data.email !== existing.email) {
      const duplicate = await this.prisma.user.findUnique({ where: { email: data.email as string } });
      if (duplicate) throw new ConflictException('Email already exists');
    }
    const updated = await this.prisma.user.update({
      where: { uuid }, data, select: SAFE_USER_SELECT,
    });
    return updated;
  }

  async changeRole(uuid: string, role: 'ADMIN' | 'USER') {
    await this.findByUuid(uuid);
    return this.prisma.user.update({
      where: { uuid }, data: { role }, select: SAFE_USER_SELECT,
    });
  }

  async remove(uuid: string, requester: { sub: string; role: 'USER'|'ADMIN' }) {
    if (requester.role !== 'ADMIN' && requester.sub !== uuid) {
      throw new ForbiddenException('You can delete only your own account');
    }
    await this.findByUuid(uuid);
    try {
      await this.prisma.user.delete({ where: { uuid } });
    } catch {
      throw new ConflictException('User cannot be deleted while owning groups');
    }
    await this.redis.deleteRefreshToken(uuid);
    return 'User deleted successfully';
  }

  async mapper(uuid: string) {
    return UserMapper(await this.findByUuid(uuid));
  }
}
