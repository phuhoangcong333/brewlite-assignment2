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
import { PrismaInventoryRepository } from '../inventory/prisma-inventory.repository';
import {
  InventorySnapshot,
  InventoryUpdate,
  InventoryWant,
  planReserve,
} from '../inventory/inventory.plan';
import { planCancel } from './order-cancel.plan';
import {
  assertCanCancelOrder,
  assertTransition,
  CancellationActor,
  OrderStatus,
} from './order-state';
import { computeDiscount } from '../promotions/promotion-rules';
import { calculateLoyaltyPoints } from './loyalty-points';

const MAX_CREATE_ATTEMPTS = 3;
const SIZE_PRICE: Record<Size, number> = {
  S: 0,
  M: 5_000,
  L: 10_000,
};

export interface CreateOrderItemInput extends InventoryWant {
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
    const toppings = item.toppings ?? [];
    if (
      toppings.some((topping) => topping.trim().length === 0) ||
      new Set(toppings).size !== toppings.length
    ) {
      throw new BadRequestException('Invalid or duplicate topping');
    }
  }
}

function toInventorySnapshots(
  products: readonly { id: number; stock: number; version: number }[],
): InventorySnapshot[] {
  return products.map(({ id, stock, version }) => ({
    productId: id,
    stock,
    version,
  }));
}

function buildOrderItems(
  products: readonly { id: number; price: number }[],
  items: readonly CreateOrderItemInput[],
  toppings: readonly {
    id: string;
    name: string;
    price: number;
    amountPerPortion: number;
  }[],
) {
  const prices = new Map(products.map(({ id, price }) => [id, price]));
  const toppingMap = new Map(
    toppings.map((topping) => [topping.id, topping]),
  );

  return items.map((item) => {
    const productPrice = prices.get(item.productId);
    if (productPrice === undefined) {
      throw new RangeError(`Product ${item.productId} was not found`);
    }

    const toppingIdsForItem = item.toppings ?? [];
    const selectedToppings = toppingIdsForItem.map((id) => toppingMap.get(id));
    const resolvedToppings = selectedToppings.filter(
      (topping): topping is (typeof toppings)[number] => topping !== undefined,
    );
    if (resolvedToppings.length !== toppingIdsForItem.length) {
      throw new RangeError(`Unsupported topping on product ${item.productId}`);
    }
    const unitPrice =
      productPrice +
      SIZE_PRICE[item.size] +
      resolvedToppings.reduce((sum, topping) => sum + topping.price, 0);
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
      toppings: resolvedToppings.map((topping) => topping.name),
      toppingIds: toppingIdsForItem,
      toppingAmounts: resolvedToppings.map(
        (topping) => topping.amountPerPortion,
      ),
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryRepository: PrismaInventoryRepository,
  ) {}

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
      where: { status: { in: ['PENDING', 'PAID', 'PREPARING', 'READY'] } },
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

  async getOrderForUser(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: true } },
        loyaltyTransaction: { select: { points: true, createdAt: true } },
      },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} was not found`);
    return order;
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

    await this.transitionOrder(orderId, to, userId);
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

    if (!['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(to)) {
      throw new InvalidTransitionException(order.status, to);
    }

    await this.transitionOrder(orderId, to, undefined, 'STAFF');
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
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                version: true,
                recipeItems: {
                  select: {
                    ingredientId: true,
                    size: true,
                    amountRequired: true,
                    ingredient: {
                      select: {
                        id: true,
                        name: true,
                        unit: true,
                        stockQuantity: true,
                        version: true,
                      },
                    },
                  },
                },
              },
            });
          const toppingIds = [
            ...new Set(items.flatMap((item) => item.toppings ?? [])),
          ];
          const toppings =
            toppingIds.length > 0
              ? await transaction.topping.findMany({
                  where: { id: { in: toppingIds } },
                  include: {
                    ingredient: {
                      select: {
                        id: true,
                        name: true,
                        unit: true,
                        stockQuantity: true,
                        version: true,
                      },
                    },
                  },
                })
              : [];
          const toppingMap = new Map(toppings.map((topping) => [topping.id, topping]));
          if (toppings.length !== toppingIds.length) {
            throw new BadRequestException('Có topping không tồn tại');
          }

          const requiredIngredients = new Map<
            number,
            {
              name: string;
              unit: string;
              stockQuantity: number;
              version: number;
              totalRequired: number;
            }
          >();
          const hasRecipeItems = products.some(
            (p) => p.recipeItems && p.recipeItems.length > 0,
          );

            const consumption: Array<{
              ingredientId: number;
              quantity: number;
            }> = [];

            if (products.length !== productIds.length) {
              throw new BadRequestException(
                'Không tìm thấy sản phẩm trong hệ thống',
              );
            }
            const productMap = new Map(products.map((p) => [p.id, p]));

            if (hasRecipeItems) {
              for (const item of items) {
                const product = productMap.get(item.productId)!;
                if (!product.recipeItems || product.recipeItems.length === 0) {
                  throw new BadRequestException(
                    `Món "${product.name}" chưa có công thức nguyên liệu`,
                  );
                }

                const sizeRecipes = product.recipeItems.filter(
                  (recipe) => recipe.size === item.size,
                );
                if (sizeRecipes.length === 0)
                  throw new BadRequestException(
                    `Món "${product.name}" chưa có công thức cho size ${item.size}`,
                  );
                for (const recipe of sizeRecipes) {
                  const needed = recipe.amountRequired * item.qty;
                  const existing = requiredIngredients.get(recipe.ingredientId);
                  if (existing) {
                    existing.totalRequired += needed;
                  } else {
                    requiredIngredients.set(recipe.ingredientId, {
                      name: recipe.ingredient.name,
                      unit: recipe.ingredient.unit,
                      stockQuantity: recipe.ingredient.stockQuantity,
                      version: recipe.ingredient.version,
                      totalRequired: needed,
                    });
                  }
                }
              }
            }

            for (const item of items) {
              for (const id of item.toppings ?? []) {
                const topping = toppingMap.get(id);
                if (!topping) {
                  throw new BadRequestException(`Topping ${id} không tồn tại`);
                }
                const ingredient = topping.ingredient;
                const needed = topping.amountPerPortion * item.qty;
                const existing = requiredIngredients.get(ingredient.id);
                if (existing) {
                  existing.totalRequired += needed;
                } else {
                  requiredIngredients.set(ingredient.id, {
                    name: ingredient.name,
                    unit: ingredient.unit,
                    stockQuantity: ingredient.stockQuantity,
                    version: ingredient.version,
                    totalRequired: needed,
                  });
                }
              }
            }

            if (!hasRecipeItems) {
              const updates = planReserve(items, toInventorySnapshots(products));
              const applied =
                await this.inventoryRepository.applyUpdatesInTransaction(
                  transaction,
                  updates,
                );
              if (!applied) {
                throw new RetryOrderTransactionError();
              }
            }

            for (const [ingredientId, info] of requiredIngredients.entries()) {
              if (
                !Number.isSafeInteger(info.totalRequired) ||
                info.totalRequired <= 0 ||
                info.stockQuantity < info.totalRequired
              ) {
                throw new BadRequestException(
                  `Không đủ nguyên liệu "${info.name}" (cần ${info.totalRequired}${info.unit}, còn ${info.stockQuantity}${info.unit})`,
                );
              }
              const updated = await transaction.ingredient.updateMany({
                where: {
                  id: ingredientId,
                  version: info.version,
                  stockQuantity: { gte: info.totalRequired },
                },
                data: {
                  stockQuantity: { decrement: info.totalRequired },
                  version: { increment: 1 },
                },
              });
              if (updated.count !== 1) {
                throw new RetryOrderTransactionError();
              }
              consumption.push({
                ingredientId,
                quantity: info.totalRequired,
              });
            }

            const orderItems = buildOrderItems(products, items, toppings);
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

              discount = computeDiscount(
                {
                  discountType: 'PERCENT',
                  discountValue: promotion.percent,
                  maxDiscountAmount: null,
                },
                subtotal,
              );
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
                usesIngredientInventory: hasRecipeItems,
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
    actor: CancellationActor = 'CUSTOMER',
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
          items: {
            select: {
              productId: true,
              size: true,
              qty: true,
              toppingIds: true,
              toppingAmounts: true,
            },
          },
          usesIngredientInventory: true,
          ingredients: { select: { ingredientId: true, quantity: true } },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} was not found`);
      }

      const from = order.status as OrderStatus;
      if (to === 'CANCELLED') assertCanCancelOrder(from, actor);
      else assertTransition(from, to);

      let releaseUpdates: InventoryUpdate[] = [];
      const ingredientReleases = new Map<number, number>();
      if (to === 'CANCELLED') {
        const productIds = [
          ...new Set(order.items.map(({ productId }) => productId)),
        ];
        const products = await transaction.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            stock: true,
            version: true,
            recipeItems: {
              select: {
                ingredientId: true,
                size: true,
                amountRequired: true,
              },
            },
          },
        });
        const hasRecipeItems = products.some(
          (product) => product.recipeItems.length > 0,
        );

        if (order.ingredients.length > 0) {
          for (const ingredient of order.ingredients) {
            ingredientReleases.set(ingredient.ingredientId, ingredient.quantity);
          }
        } else if (
          order.usesIngredientInventory === null &&
          ['PENDING', 'PAYMENT_FAILED'].includes(from) &&
          (hasRecipeItems || order.items.some((item) => item.toppingIds.length > 0))
        ) {
          const recipesByProduct = new Map(
            products.map((product) => [product.id, product.recipeItems]),
          );
          for (const item of order.items) {
            const recipes = (recipesByProduct.get(item.productId) ?? []).filter(
              (recipe) => recipe.size === item.size,
            );
            for (const recipe of recipes) {
              const quantity = recipe.amountRequired * item.qty;
              ingredientReleases.set(
                recipe.ingredientId,
                (ingredientReleases.get(recipe.ingredientId) ?? 0) + quantity,
              );
            }
          }

          const toppingIds = [
            ...new Set(order.items.flatMap((item) => item.toppingIds)),
          ];
          const toppings =
            toppingIds.length > 0
              ? await transaction.topping.findMany({
                  where: { id: { in: toppingIds } },
                  select: {
                    id: true,
                    amountPerPortion: true,
                    ingredientId: true,
                  },
                })
              : [];
          const toppingsById = new Map(
            toppings.map((topping) => [topping.id, topping]),
          );
          for (const item of order.items) {
            for (const [index, toppingId] of item.toppingIds.entries()) {
              const topping = toppingsById.get(toppingId);
              const amountPerPortion = item.toppingAmounts[index];
              if (!topping || !Number.isSafeInteger(amountPerPortion) || amountPerPortion <= 0) {
                throw new BadRequestException(
                  `Không thể hoàn kho topping ${toppingId}`,
                );
              }
              const quantity = amountPerPortion * item.qty;
              ingredientReleases.set(
                topping.ingredientId,
                (ingredientReleases.get(topping.ingredientId) ?? 0) +
                  quantity,
              );
            }
          }
        }

        const shouldRestoreProductStock =
          order.usesIngredientInventory !== true &&
          (order.usesIngredientInventory !== null || !hasRecipeItems);
        if (shouldRestoreProductStock) {
          releaseUpdates = planCancel(
            from,
            order.items,
            toInventorySnapshots(products),
            actor,
          );
        }
      }

      const changed = await transaction.order.updateMany({
        where: { id: orderId, status: from },
        data: { status: to },
      });

      if (changed.count !== 1) {
        throw new OrderTransitionConflictException(orderId);
      }

      const points =
        from === 'READY' && to === 'COMPLETED'
          ? calculateLoyaltyPoints(order.total)
          : 0;
      if (points > 0) {
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

      if (ingredientReleases.size > 0) {
        for (const [ingredientId, quantity] of [...ingredientReleases].sort(
          ([a], [b]) => a - b,
        )) {
          const restored = await transaction.ingredient.updateMany({
            where: {
              id: ingredientId,
              stockQuantity: { lte: 2_147_483_647 - quantity },
            },
            data: {
              stockQuantity: { increment: quantity },
              version: { increment: 1 },
            },
          });
          if (restored.count !== 1) throw new InventoryConcurrencyException();
        }
      }

      if (
        releaseUpdates.length > 0 &&
        !(await this.inventoryRepository.applyUpdatesInTransaction(
          transaction,
          releaseUpdates,
        ))
      ) {
        throw new InventoryConcurrencyException();
      }
    });
  }
}
