import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.ingredient.findMany({ orderBy: { id: 'asc' } });
  }

  async restock(id: number, quantity: number) {
    try {
      return await this.prisma.ingredient.update({
        where: { id },
        data: { quantity: { increment: quantity } },
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'P2025') {
        throw new NotFoundException(`Ingredient ${id} was not found`);
      }
      if (code === 'P2020') {
        throw new BadRequestException(
          'Ingredient quantity exceeds storage capacity',
        );
      }
      throw error;
    }
  }
}
