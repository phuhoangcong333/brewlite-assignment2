import { Injectable } from '@nestjs/common';
import { Promotion } from '../promotion.types';
import { PromotionRepository } from '../repositories';
import { PrismaService } from '../../prisma/prisma.service';

/** Cài đặt đọc mã khuyến mãi bằng Prisma. Model Promotion: xem prisma/promotion.prisma. */
@Injectable()
export class PrismaPromotionRepository extends PromotionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByCode(code: string): Promise<Promotion | null> {
    return (this.prisma as any).promotion.findUnique({ where: { code } });
  }
}
