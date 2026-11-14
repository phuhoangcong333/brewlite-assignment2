import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersController } from './orders.controller';

describe('OrdersController', () => {
  it('uses the authenticated user instead of a body userId', async () => {
    const orderService = {
      createOrder: jest.fn().mockResolvedValue({ id: 10 }),
    } as unknown as OrderService;

    const controller = new OrdersController(orderService);

    await controller.createOrder(
      { user: { sub: 42, email: 'user@example.test' } } as never,
      {
        items: [{ productId: 3, qty: 2, size: 'M', toppings: [] }],
        promoCode: 'GIAM10',
      },
    );

    expect(orderService.createOrder).toHaveBeenCalledWith(
      42,
      [{ productId: 3, qty: 2, size: 'M', toppings: [] }],
      'GIAM10',
    );
  });

  it('rejects a body userId when the global whitelist policy is applied', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      userId: 99,
      items: [{ productId: 3, qty: 1, size: 'S' }],
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(
      errors.some((error) => error.property === 'userId'),
    ).toBe(true);
  });

  it('rejects an empty item list', async () => {
    const orderService = {
      createOrder: jest.fn(),
    } as unknown as OrderService;

    const controller = new OrdersController(orderService);

    expect(() =>
      controller.createOrder(
        { user: { sub: 42, email: 'user@example.test' } } as never,
        { items: [] },
      ),
    ).toThrow(BadRequestException);

    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it('rejects quantities above the quote limit', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      items: [{ productId: 3, qty: 11, size: 'S' }],
    });

    const errors = await validate(dto);
    const itemError = errors[0]?.children?.[0];
    const quantityError = itemError?.children?.find(
      (error) => error.property === 'qty',
    );

    expect(quantityError?.constraints).toHaveProperty('max');
  });

  it('rejects more order items than the quote limit', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      items: Array.from({ length: 21 }, () => ({
        productId: 3,
        qty: 1,
        size: 'S',
      })),
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'items')?.constraints)
      .toHaveProperty('arrayMaxSize');
  });
});
