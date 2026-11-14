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
    const promotion = await this.prisma.promotion.findUnique({
      where: { code },
    });
    if (!promotion) return null;

    return {
      id: promotion.id,
      code: promotion.code,
      description: null,
      discountType: 'PERCENT',
      discountValue: promotion.percent,
      maxDiscountAmount: null,
      minOrderValue: 0,
      startsAt: new Date(0),
      expiresAt: promotion.expiresAt,
      usageLimit: 1,
      usedCount: promotion.usageLeft > 0 ? 0 : 1,
      isActive: true,
    };
  }
}
