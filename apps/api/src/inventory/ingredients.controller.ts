import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Size } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import {
  AdjustIngredientStockDto,
  CreateIngredientDto,
  RestockIngredientDto,
  UpdateProductRecipeDto,
} from './dto/ingredient.dto';

const MAX_STOCK_QUANTITY = 2_147_483_647;

@Controller('ingredients')
@UseGuards(JwtAuthGuard, StaffGuard)
export class IngredientsController {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Lấy danh sách toàn bộ nguyên liệu trong kho
  @Get()
  async findAll() {
    return this.prisma.ingredient.findMany({
      orderBy: { id: 'asc' },
      include: {
        recipeItems: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  @Patch(':id/adjust')
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustIngredientStockDto,
  ) {
    if (
      !Number.isSafeInteger(dto.amount) ||
      dto.amount === 0 ||
      dto.amount < -MAX_STOCK_QUANTITY - 1 ||
      dto.amount > MAX_STOCK_QUANTITY
    ) {
      throw new BadRequestException(
        'Số lượng điều chỉnh phải là số nguyên khác 0 trong giới hạn cho phép',
      );
    }

    const existing = await this.prisma.ingredient.findUnique({
      where: { id },
      select: { id: true, stockQuantity: true, version: true },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu ID ${id}`);
    }

    const isReduction = dto.amount < 0;
    const adjustment = Math.abs(dto.amount);
    const updated = await this.prisma.ingredient.updateMany({
      where: {
        id,
        version: existing.version,
        stockQuantity: isReduction
          ? { gte: adjustment }
          : { lte: MAX_STOCK_QUANTITY - adjustment },
      },
      data: {
        stockQuantity: isReduction
          ? { decrement: adjustment }
          : { increment: adjustment },
        version: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      const current = await this.prisma.ingredient.findUnique({
        where: { id },
        select: { stockQuantity: true },
      });
      if (!current) {
        throw new NotFoundException(`Không tìm thấy nguyên liệu ID ${id}`);
      }
      if (isReduction && current.stockQuantity < adjustment) {
        throw new BadRequestException(
          'Số lượng điều chỉnh làm tồn kho nhỏ hơn 0',
        );
      }
      if (
        !isReduction &&
        current.stockQuantity > MAX_STOCK_QUANTITY - adjustment
      ) {
        throw new BadRequestException(
          'Số lượng điều chỉnh vượt quá giới hạn tồn kho',
        );
      }
      throw new ConflictException(
        'Tồn kho vừa được cập nhật, vui lòng tải lại và thử lại',
      );
    }

    return this.prisma.ingredient.findUniqueOrThrow({ where: { id } });
  }

  // 2. Thêm mới một nguyên liệu (nếu cần)
  @Post()
  async create(@Body() dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        name: dto.name.trim(),
        unit: dto.unit.trim(),
        stockQuantity: dto.stockQuantity,
      },
    });
  }

  // 3. Nhập thêm nguyên liệu vào kho: PATCH /ingredients/:id/restock
  @Patch(':id/restock')
  async restock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestockIngredientDto,
  ) {
    const addedAmount = dto.amount ?? dto.quantity ?? dto.stockQuantity;
    if (
      addedAmount === undefined ||
      !Number.isSafeInteger(addedAmount) ||
      addedAmount <= 0
    ) {
      throw new BadRequestException(
        'Số lượng nhập thêm (amount) phải là số nguyên dương',
      );
    }

    const existing = await this.prisma.ingredient.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu ID ${id}`);
    }

    return this.prisma.ingredient.update({
      where: { id },
      data: {
        stockQuantity: { increment: addedAmount },
        version: { increment: 1 },
      },
    });
  }

  // 4. Cập nhật công thức định lượng cho 1 món: PUT /ingredients/recipes/:productId
  @Put('recipes/:productId')
  async updateRecipePut(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateProductRecipeDto,
  ) {
    return this.saveProductRecipe(productId, dto);
  }

  // Hỗ trợ thêm cả PATCH /ingredients/recipes/:productId để Frontend gọi kiểu nào cũng khớp
  @Patch('recipes/:productId')
  async updateRecipePatch(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateProductRecipeDto,
  ) {
    return this.saveProductRecipe(productId, dto);
  }

  private async saveProductRecipe(
    productId: number,
    dto: UpdateProductRecipeDto,
  ) {
    const sizes = new Set(dto.items.map(({ size }) => size));
    if (Object.values(Size).some((size) => !sizes.has(size))) {
      throw new BadRequestException(
        'Công thức phải có định lượng cho size S, M và L',
      );
    }

    const recipeKeys = dto.items.map(
      ({ size, ingredientId }) => `${size}:${ingredientId}`,
    );
    if (new Set(recipeKeys).size !== recipeKeys.length) {
      throw new BadRequestException(
        'Mỗi nguyên liệu chỉ được xuất hiện một lần trong cùng một size',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy món nước ID ${productId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.recipeItem.deleteMany({
        where: { productId },
      });

      if (dto.items && dto.items.length > 0) {
        await tx.recipeItem.createMany({
          data: dto.items.map((item) => ({
            productId,
            ingredientId: item.ingredientId,
            size: item.size,
            amountRequired: item.amountRequired,
          })),
        });
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: {
          recipeItems: {
            include: {
              ingredient: true,
            },
          },
        },
      });
    });
  }
}
