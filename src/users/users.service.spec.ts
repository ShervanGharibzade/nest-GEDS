import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UserRole } from '../prisma/generated/enums.js';

vi.mock('bcrypt', () => ({
  hash: vi.fn(async () => 'hashed-password'),
  compare: vi.fn(async (plain: string, hash: string) => plain === 'correct-password'),
}));

function buildService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  };
  const accessTokenService = { generate: vi.fn(async () => 'access-token') };
  const refreshTokenService = { generate: vi.fn(async () => 'refresh-token') };
  const redisService = { setRefreshToken: vi.fn() };

  const service = new UsersService(
    prisma as any,
    accessTokenService as any,
    refreshTokenService as any,
    redisService as any,
  );

  return { service, prisma, accessTokenService, refreshTokenService, redisService };
}

describe('UsersService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('create (register)', () => {
    it('rejects a duplicate email', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.create({ email: 'a@a.com', name: 'A', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password before storing', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1, email: 'a@a.com' });

      await service.create({ email: 'a@a.com', name: 'A', password: 'password123' });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'a@a.com', name: 'A', passwordHash: 'hashed-password' },
      });
    });
  });

  describe('verify (login)', () => {
    it('rejects unknown email', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verify({ email: 'nope@a.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects wrong password', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
      });

      await expect(
        service.verify({ email: 'a@a.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues tokens and stores the refresh token on success', async () => {
      const { service, prisma, redisService } = buildService();
      const user = {
        id: 1,
        email: 'a@a.com',
        passwordHash: 'hashed-password',
        role: UserRole.USER,
      };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.verify({
        email: 'a@a.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(redisService.setRefreshToken).toHaveBeenCalledWith(1, 'refresh-token');
    });
  });

  describe('update', () => {
    it('allows a user to update their own account', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'Old' });
      prisma.user.update.mockResolvedValue({ id: 1, name: 'New' });

      const result = await service.update(
        1,
        { name: 'New' },
        { id: 1, role: UserRole.USER },
      );

      expect(result.name).toBe('New');
    });

    it('blocks a user from updating someone else', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 2, name: 'Other' });

      await expect(
        service.update(2, { name: 'Hacked' }, { id: 1, role: UserRole.USER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows an admin to update someone else', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 2, name: 'Other' });
      prisma.user.update.mockResolvedValue({ id: 2, name: 'Fixed' });

      const result = await service.update(
        2,
        { name: 'Fixed' },
        { id: 1, role: UserRole.ADMIN },
      );

      expect(result.name).toBe('Fixed');
    });
  });
});
