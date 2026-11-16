import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateToppingPortionDto } from './dto/topping.dto';

@Controller('toppings')
export class ToppingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    const toppings = await this.prisma.topping.findMany({
      orderBy: { id: 'asc' },
      include: { ingredient: true },
    });

    return toppings.map((topping) => ({
      id: topping.id,
      name: topping.name,
      price: topping.price,
      amountPerPortion: topping.amountPerPortion,
      unit: topping.ingredient.unit,
      stockQuantity: topping.ingredient.stockQuantity,
      availableQuantity: Math.floor(
        topping.ingredient.stockQuantity / topping.amountPerPortion,
      ),
    }));
  }

  @Patch(':id/portion')
  @UseGuards(JwtAuthGuard, StaffGuard)
  async updatePortion(
    @Param('id') id: string,
    @Body() dto: UpdateToppingPortionDto,
  ) {
    const topping = await this.prisma.topping.findUnique({ where: { id } });
    if (!topping) {
      throw new NotFoundException(`Không tìm thấy topping ${id}`);
    }

    const updated = await this.prisma.topping.update({
      where: { id },
      data: { amountPerPortion: dto.amountPerPortion },
      include: { ingredient: true },
    });
    return {
      id: updated.id,
      name: updated.name,
      price: updated.price,
      amountPerPortion: updated.amountPerPortion,
      unit: updated.ingredient.unit,
      stockQuantity: updated.ingredient.stockQuantity,
      availableQuantity: Math.floor(
        updated.ingredient.stockQuantity / updated.amountPerPortion,
      ),
    };
  }
}
