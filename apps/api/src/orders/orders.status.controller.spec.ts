import { BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrdersController } from './orders.controller';

describe('OrdersController — TV6 S2 API contract', () => {
  const request = { user: { sub: 42, email: 'owner@example.test' } } as never;

  it('gets order details using JWT owner id, not a caller-supplied user id', async () => {
    const getOrderForUser = jest.fn().mockResolvedValue({ id: 5, status: 'READY' });
    const service = { getOrderForUser } as unknown as OrderService;
    const controller = new OrdersController(service);
    await expect(controller.getOrderById(request, 5)).resolves.toMatchObject({
      id: 5, status: 'READY',
    });
    expect(getOrderForUser).toHaveBeenCalledWith(5, 42);
  });

  it('refuses zero/negative ids before querying an order', () => {
    const getOrderForUser = jest.fn();
    const controller = new OrdersController({ getOrderForUser } as unknown as OrderService);
    expect(() => controller.getOrderById(request, 0)).toThrow(BadRequestException);
    expect(() => controller.getOrderById(request, -1)).toThrow(BadRequestException);
    expect(getOrderForUser).not.toHaveBeenCalled();
  });

  it('refuses PATCH id 0 instead of calling OrderService', async () => {
    const transitionOrderForStaff = jest.fn();
    const controller = new OrdersController({ transitionOrderForStaff } as unknown as OrderService);
    await expect(controller.transitionOrder(0, { status: 'PREPARING' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(transitionOrderForStaff).not.toHaveBeenCalled();
  });
});
