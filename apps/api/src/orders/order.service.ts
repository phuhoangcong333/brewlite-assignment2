import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Size } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  InventoryConcurrencyException,
  InvalidTransitionException,
  OrderTransitionConflictException,
} from '../common/errors';
import { assertTransition, OrderStatus } from './order-state';

const MAX_CREATE_ATTEMPTS = 3;
const SIZE_PRICE: Record<Size, number> = {
  S: 0,
  M: 5_000,
  L: 10_000,
};
const TOPPING_PRICE = 5_000;
const VALID_TOPPINGS = new Set(['Trân châu', 'Kem']);

export interface CreateOrderItemInput {
  productId: number;
  qty: number;
  size: Size;
  toppings?: string[];
}

class RetryOrderTransactionError extends Error {}

function validateCreateOrderInput(
  userId: number,
  items: readonly CreateOrderItemInput[],
): void {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new RangeError('User id must be a positive integer');
  }
  if (items.length === 0) {
    throw new RangeError('An order must contain at least one item');
  }

  for (const item of items) {
    if (
      !Number.isSafeInteger(item.productId) ||
      item.productId <= 0 ||
      !Number.isSafeInteger(item.qty) ||
      item.qty <= 0 ||
      !Object.values(Size).includes(item.size)
    ) {
      throw new BadRequestException('Invalid product, quantity or size');
    }
    for (const topping of item.toppings ?? []) {
      if (!VALID_TOPPINGS.has(topping)) {
        throw new RangeError(`Unsupported topping: ${topping}`);
      }
    }
  }
}

function buildOrderItems(
  products: readonly { id: number; price: number }[],
  items: readonly CreateOrderItemInput[],
) {
  const prices = new Map(products.map(({ id, price }) => [id, price]));

  return items.map((item) => {
    const productPrice = prices.get(item.productId);
    if (productPrice === undefined) {
      throw new RangeError(`Product ${item.productId} was not found`);
    }

    const toppings = item.toppings ?? [];
    const unitPrice =
      productPrice + SIZE_PRICE[item.size] + TOPPING_PRICE * toppings.length;
    const lineTotal = unitPrice * item.qty;
    if (!Number.isSafeInteger(lineTotal)) {
      throw new RangeError(
        `Line total for product ${item.productId} exceeds the safe integer range`,
      );
    }

    return {
      productId: item.productId,
      size: item.size,
      qty: item.qty,
      toppings,
      lineTotal,
    };
  });
}

function calculateOrderTotal(
  orderItems: readonly { lineTotal: number }[],
): number {
  const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Order total exceeds the safe integer range');
  }
  return total;
}

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}
  async getOrdersForUser(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async getOrdersForStaff() {
    return this.prisma.order.findMany({
      where: { status: { in: ['PAID', 'PREPARING', 'READY'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async transitionOrderForUser(
    orderId: number,
    to: OrderStatus,
    userId: number,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Order ${orderId} was not found`);
    }

    await this.transitionOrder(orderId, to);
  }

  async transitionOrderForStaff(
    orderId: number,
    to: OrderStatus,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found`);
    }

    if (!['PREPARING', 'READY', 'COMPLETED'].includes(to)) {
      throw new InvalidTransitionException(order.status, to);
    }

    await this.transitionOrder(orderId, to);
  }

  async createOrder(
    userId: number,
    items: readonly CreateOrderItemInput[],
    promoCode?: string,
  ): Promise<{
    id: number;
    status: OrderStatus;
    total: number;
    discount: number;
  }> {
    validateCreateOrderInput(userId, items);

    const productIds = [...new Set(items.map(({ productId }) => productId))];

    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const products = await transaction.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, price: true, recipe: true },
            });
            const recipes = new Map(
              products.map((product) => [product.id, product.recipe]),
            );
            const requirements = new Map<number, Prisma.Decimal>();
            for (const item of items) {
              const recipe = recipes.get(item.productId);
              if (!recipe)
                throw new BadRequestException(
                  `Product ${item.productId} was not found`,
                );
              if (recipe.length === 0)
                throw new BadRequestException(
                  `Product ${item.productId} has no recipe`,
                );
              for (const entry of recipe) {
                const required = entry.quantity.mul(item.qty);
                requirements.set(
                  entry.ingredientId,
                  (
                    requirements.get(entry.ingredientId) ??
                    new Prisma.Decimal(0)
                  ).add(required),
                );
              }
            }
            // Stable lock order avoids deadlocks; the predicate prevents negative stock.
            const consumption = [...requirements]
              .sort(([a], [b]) => a - b)
              .map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
            for (const entry of consumption) {
              const applied = await transaction.ingredient.updateMany({
                where: {
                  id: entry.ingredientId,
                  quantity: { gte: entry.quantity },
                },
                data: { quantity: { decrement: entry.quantity } },
              });
              if (applied.count !== 1) {
                throw new BadRequestException(
                  `Insufficient ingredient ${entry.ingredientId}`,
                );
              }
            }

            const orderItems = buildOrderItems(products, items);
            const subtotal = calculateOrderTotal(orderItems);
            let discount = 0;
            let appliedPromoCode: string | undefined;

            if (promoCode) {
              const promotion = await transaction.promotion.findUnique({
                where: { code: promoCode.trim().toUpperCase() },
                select: {
                  code: true,
                  percent: true,
                  expiresAt: true,
                  usageLeft: true,
                },
              });
              const now = new Date();
              if (
                !promotion ||
                promotion.usageLeft <= 0 ||
                promotion.expiresAt <= now
              ) {
                throw new BadRequestException(
                  `Promotion ${promoCode} is invalid or expired`,
                );
              }

              discount = Math.floor((subtotal * promotion.percent) / 100);
              appliedPromoCode = promotion.code;
              const consumed = await transaction.promotion.updateMany({
                where: {
                  code: promotion.code,
                  usageLeft: { gt: 0 },
                  expiresAt: { gt: now },
                },
                data: { usageLeft: { decrement: 1 } },
              });
              if (consumed.count !== 1) {
                throw new RetryOrderTransactionError();
              }
            }

            const total = subtotal - discount;

            const order = await transaction.order.create({
              data: {
                userId,
                total,
                discount,
                promoCode: appliedPromoCode,
                items: { create: orderItems },
                ingredients: { create: consumption },
              },
              select: { id: true, status: true, total: true, discount: true },
            });

            return order;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          !(error instanceof RetryOrderTransactionError) &&
          (error as { code?: string }).code !== 'P2034'
        ) {
          throw error;
        }
      }
    }

    throw new InventoryConcurrencyException();
  }

  async listOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        total: true,
        discount: true,
        promoCode: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            size: true,
            qty: true,
            toppings: true,
            lineTotal: true,
          },
        },
      },
    });
  }

  async transitionOrder(
    orderId: number,
    to: OrderStatus,
    userId?: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: {
          id: orderId,
          ...(userId === undefined ? {} : { userId }),
        },
        select: {
          userId: true,
          total: true,
          status: true,
          ingredients: { select: { ingredientId: true, quantity: true } },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} was not found`);
      }

      const from = order.status as OrderStatus;
      assertTransition(from, to);

      const changed = await transaction.order.updateMany({
        where: { id: orderId, status: from },
        data: { status: to },
      });

      if (changed.count !== 1) {
        throw new OrderTransitionConflictException(orderId);
      }

      if (from === 'READY' && to === 'COMPLETED') {
        const points = Math.floor(order.total / 10_000);
        await transaction.loyaltyTransaction.create({
          data: {
            userId: order.userId,
            orderId,
            points,
          },
        });
        await transaction.user.update({
          where: { id: order.userId },
          data: { loyaltyPoints: { increment: points } },
        });
      }

      if (to === 'CANCELLED') {
        for (const entry of order.ingredients.sort(
          (a, b) => a.ingredientId - b.ingredientId,
        )) {
          await transaction.ingredient.update({
            where: { id: entry.ingredientId },
            data: { quantity: { increment: entry.quantity } },
          });
        }
      }
    });
  }
}
