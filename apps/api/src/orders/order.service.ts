import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Size } from '@prisma/client';
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
import { assertTransition, OrderStatus } from './order-state';
import { computeDiscount } from '../promotions/promotion-rules';

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
        return await this.prisma.$transaction(async (transaction) => {
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

          const hasRecipeItems = products.some(
            (p) => p.recipeItems && p.recipeItems.length > 0,
          );
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

          if (hasRecipeItems) {
            if (products.length !== productIds.length) {
              throw new BadRequestException(
                'Không tìm thấy sản phẩm trong hệ thống',
              );
            }

            const productMap = new Map(products.map((p) => [p.id, p]));

            for (const item of items) {
              if (!Number.isSafeInteger(item.qty) || item.qty <= 0) {
                throw new BadRequestException(
                  `Số lượng đặt cho sản phẩm ${item.productId} phải lớn hơn 0`,
                );
              }

              const product = productMap.get(item.productId)!;
              if (!product.recipeItems || product.recipeItems.length === 0) {
                throw new BadRequestException(
                  `Món "${product.name}" chưa có công thức nguyên liệu`,
                );
              }

              const sizeRecipes = product.recipeItems.filter(
                (recipe) => recipe.size === item.size,
              );
              if (sizeRecipes.length === 0) {
                throw new BadRequestException(
                  `Món "${product.name}" chưa có công thức cho size ${item.size}`,
                );
              }

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
          } else {
            // Giữ nguyên luồng chuẩn khi sản phẩm không gắn RecipeItem (tương thích bộ test hiện có)
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

          for (const info of requiredIngredients.values()) {
            if (info.stockQuantity < info.totalRequired) {
              throw new BadRequestException(
                `Không đủ nguyên liệu "${info.name}" (cần ${info.totalRequired}${info.unit}, còn ${info.stockQuantity}${info.unit})`,
              );
            }
          }

          for (const [ingredientId, info] of requiredIngredients.entries()) {
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
              throw new RangeError(
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
            },
            select: { id: true, status: true, total: true, discount: true },
          });

          return order;
        });
      } catch (error) {
        if (!(error instanceof RetryOrderTransactionError)) {
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
          items: {
            select: {
              productId: true,
              size: true,
              qty: true,
              toppingIds: true,
              toppingAmounts: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} was not found`);
      }

      const from = order.status as OrderStatus;
      assertTransition(from, to);

      let releaseUpdates: InventoryUpdate[] = [];
      const ingredientReleases = new Map<
        number,
        { version: number; amountToRestore: number }
      >();
      let hasRecipeItems = false;
      let hasIngredientInventory = false;

      if (to === 'CANCELLED') {
        const toppingIds = [
          ...new Set(order.items.flatMap((item) => item.toppingIds)),
        ];
        const toppings =
          toppingIds.length > 0
            ? await transaction.topping.findMany({
                where: { id: { in: toppingIds } },
                include: {
                  ingredient: { select: { id: true, version: true } },
                },
              })
            : [];
        const toppingMap = new Map(toppings.map((topping) => [topping.id, topping]));
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
                ingredient: {
                  select: { id: true, version: true },
                },
              },
            },
          },
        });

        hasRecipeItems = products.some(
          (p) => p.recipeItems && p.recipeItems.length > 0,
        );
        hasIngredientInventory =
          hasRecipeItems ||
          order.items.some((item) => item.toppingIds.length > 0);

        if (
          hasIngredientInventory &&
          ['PENDING', 'PAYMENT_FAILED'].includes(from)
        ) {
          const productMap = new Map(products.map((p) => [p.id, p]));
          for (const item of order.items) {
            const product = productMap.get(item.productId);
            const sizeRecipes = hasRecipeItems
              ? (product?.recipeItems ?? []).filter(
                  (recipe) => recipe.size === item.size,
                )
              : [];
            for (const recipe of sizeRecipes) {
              const restoreAmount = recipe.amountRequired * item.qty;
              const current = ingredientReleases.get(recipe.ingredientId);
              if (current) {
                current.amountToRestore += restoreAmount;
              } else {
                ingredientReleases.set(recipe.ingredientId, {
                  version: recipe.ingredient.version,
                  amountToRestore: restoreAmount,
                });
              }
            }
            for (const [index, toppingId] of item.toppingIds.entries()) {
              const topping = toppingMap.get(toppingId);
              if (!topping) {
                throw new BadRequestException(
                  `Topping ${toppingId} không tồn tại để hoàn kho`,
                );
              }
              const ingredientId = topping.ingredient.id;
              const amountPerPortion = item.toppingAmounts[index];
              if (
                !Number.isSafeInteger(amountPerPortion) ||
                amountPerPortion <= 0
              ) {
                throw new BadRequestException(
                  `Thiếu định lượng topping ${toppingId} để hoàn kho`,
                );
              }
              const restoreAmount = amountPerPortion * item.qty;
              const current = ingredientReleases.get(ingredientId);
              if (current) {
                current.amountToRestore += restoreAmount;
              } else {
                ingredientReleases.set(ingredientId, {
                  version: topping.ingredient.version,
                  amountToRestore: restoreAmount,
                });
              }
            }
          }
        }

        if (!hasRecipeItems) {
          releaseUpdates = planCancel(
            from,
            order.items,
            toInventorySnapshots(products),
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

      if (ingredientReleases.size > 0) {
        for (const [ingredientId, info] of ingredientReleases.entries()) {
          const restored = await transaction.ingredient.updateMany({
            where: { id: ingredientId, version: info.version },
            data: {
              stockQuantity: { increment: info.amountToRestore },
              version: { increment: 1 },
            },
          });
          if (restored.count !== 1) {
            throw new InventoryConcurrencyException();
          }
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
