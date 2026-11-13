import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWith(user?: { role: 'CUSTOMER' | 'STAFF' }) {
  const handler = jest.fn();
  const controller = jest.fn();
  const request = { user };
  return {
    context: {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
    handler,
    controller,
  };
}

describe('RolesGuard', () => {
  it('allows routes without a role requirement', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(contextWith().context)).toBe(
      true,
    );
  });

  it('allows a user with a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['STAFF']),
    } as unknown as Reflector;

    expect(
      new RolesGuard(reflector).canActivate(
        contextWith({ role: 'STAFF' }).context,
      ),
    ).toBe(true);
  });

  it('rejects a user without a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['STAFF']),
    } as unknown as Reflector;

    expect(() =>
      new RolesGuard(reflector).canActivate(
        contextWith({ role: 'CUSTOMER' }).context,
      ),
    ).toThrow('Bạn không có quyền truy cập tài nguyên này');
  });
});
