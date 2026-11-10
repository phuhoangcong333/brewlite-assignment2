import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StaffGuard } from './staff.guard';

describe('StaffGuard', () => {
  function contextWith(user?: { sub: number }) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('rejects a request without an authenticated user', async () => {
    const findUnique = jest.fn();
    const prisma = {
      user: { findUnique },
    } as unknown as PrismaService;
    const guard = new StaffGuard(prisma);

    await expect(guard.canActivate(contextWith())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([null, { role: 'CUSTOMER' }])(
    'rejects users without STAFF role',
    async (user) => {
      const findUnique = jest.fn().mockResolvedValue(user);
      const prisma = {
        user: { findUnique },
      } as unknown as PrismaService;
      const guard = new StaffGuard(prisma);

      await expect(
        guard.canActivate(contextWith({ sub: 17 })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(findUnique).toHaveBeenCalledWith({
        where: { id: 17 },
        select: { role: true },
      });
    },
  );

  it('allows a user whose current database role is STAFF', async () => {
    const findUnique = jest.fn().mockResolvedValue({ role: 'STAFF' });
    const prisma = {
      user: { findUnique },
    } as unknown as PrismaService;
    const guard = new StaffGuard(prisma);

    await expect(
      guard.canActivate(contextWith({ sub: 17 })),
    ).resolves.toBe(true);
  });
});
