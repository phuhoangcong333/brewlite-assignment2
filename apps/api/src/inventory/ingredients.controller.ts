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
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { RecipesService } from './recipes.service';
import {
  CreateIngredientDto,
  RestockIngredientDto,
  UpdateProductRecipeDto,
} from './dto/ingredient.dto';

@Controller('ingredients')
@UseGuards(JwtAuthGuard, StaffGuard)
export class IngredientsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipes: RecipesService,
  ) {}

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

  // 2. Thêm mới một nguyên liệu (nếu cần)
  @Post()
  async create(@Body() dto: CreateIngredientDto) {
    try {
      return await this.prisma.ingredient.create({
        data: {
          name: dto.name.trim(),
          unit: dto.unit.trim(),
          stockQuantity: dto.stockQuantity,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('Ingredient already exists');
      throw error;
    }
  }

  // 3. Nhập thêm nguyên liệu vào kho: PATCH /ingredients/:id/restock
  @Patch(':id/restock')
  async restock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestockIngredientDto,
  ) {
    const addedAmount = dto.amount ?? dto.quantity ?? dto.stockQuantity;
    if (
      [dto.amount, dto.quantity, dto.stockQuantity].filter(
        (value) => value != null,
      ).length !== 1
    ) {
      throw new BadRequestException(
        'Provide exactly one of amount, quantity or stockQuantity',
      );
    }
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

    const updated = await this.prisma.ingredient.updateMany({
      where: { id, stockQuantity: { lte: 2_147_483_647 - addedAmount } },
      data: {
        stockQuantity: { increment: addedAmount },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new BadRequestException(
        'Ingredient quantity exceeds storage capacity',
      );
    return this.prisma.ingredient.findUniqueOrThrow({ where: { id } });
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
    return this.recipes.replace(productId, dto.items);
  }
}
