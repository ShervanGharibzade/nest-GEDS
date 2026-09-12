import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GroupService } from './group.service.js';

function buildService() {
  const prisma = {
    user: { findUnique: vi.fn() },
    group: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    groupMember: { create: vi.fn(), findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    expenseSplit: { findMany: vi.fn() },
    $transaction: vi.fn(async (cb: any) => cb(prisma)),
  };

  const service = new GroupService(prisma as any);
  return { service, prisma };
}

describe('GroupService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('create', () => {
    it('adds the creator as a GroupMember in the same transaction', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      const created = { id: 10, ownerId: 1, name: 'Trip' };
      prisma.group.create = vi.fn().mockResolvedValue(created);

      const result = await service.create({ name: 'Trip' }, 1);

      expect(result).toEqual(created);
      expect(prisma.groupMember.create).toHaveBeenCalledWith({
        data: { groupId: 10, userId: 1 },
      });
    });

    it('throws if the user does not exist', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create({ name: 'Trip' }, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update / remove', () => {
    it('only allows the owner to update', async () => {
      const { service, prisma } = buildService();
      prisma.group.findUnique.mockResolvedValue({ id: 1, ownerId: 1, name: 'Old' });

      await expect(
        service.update(1, { name: 'New' }, 2),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets the owner update', async () => {
      const { service, prisma } = buildService();
      prisma.group.findUnique.mockResolvedValue({ id: 1, ownerId: 1, name: 'Old' });
      prisma.group.update.mockResolvedValue({ id: 1, ownerId: 1, name: 'New' });

      const result = await service.update(1, { name: 'New' }, 1);
      expect(result.name).toBe('New');
    });

    it('only allows the owner to delete', async () => {
      const { service, prisma } = buildService();
      prisma.group.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });

      await expect(service.remove(1, 2)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('myGroups', () => {
    it('queries by ownership OR membership', async () => {
      const { service, prisma } = buildService();
      prisma.group.findMany.mockResolvedValue([]);

      await service.myGroups(5);

      expect(prisma.group.findMany).toHaveBeenCalledWith({
        where: { OR: [{ ownerId: 5 }, { members: { some: { userId: 5 } } }] },
        orderBy: { id: 'desc' },
      });
    });
  });
});
