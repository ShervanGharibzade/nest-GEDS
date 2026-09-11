import { UsersService } from './users.service.js';

describe('UsersService', () => {
  it('never returns passwordHash from safe user lookup', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          uuid: 'u', email: 'a@test', name: 'A', role: 'USER', createdAt: new Date(), updatedAt: new Date(),
        }),
      },
    } as any;
    const service = new UsersService(prisma, {} as any, {} as any, {} as any);

    const result = await service.findSafeByUuid('u');

    expect(result).toEqual(expect.objectContaining({ uuid: 'u', email: 'a@test' }));
    expect(result).not.toHaveProperty('passwordHash');
  });
});
