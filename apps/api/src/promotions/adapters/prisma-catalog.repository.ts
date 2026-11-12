import { Injectable } from '@nestjs/common';
import { CatalogRepository } from '../repositories';
import { CatalogProduct, CatalogTopping } from '../promotion.types';
// Chỉnh đường dẫn import PrismaService cho khớp repo.
import { PrismaService } from '../../prisma/prisma.service';

/**
 * ĐIỀU CHỈNH THEO schema.prisma CỦA NHÓM: tên model và tên trường dưới đây là giả định
 * (Product, Size, Topping với `price`, `stock`). Sửa lại cho khớp TV1/TV2.
 */
@Injectable()
export class PrismaCatalogRepository extends CatalogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findProducts(ids: number[]): Promise<CatalogProduct[]> {
    const rows = await (this.prisma as any).product.findMany({
      where: { id: { in: ids } },
      include: { sizes: true },
    });
    return rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl ?? null,
      basePrice: p.price,
      stock: p.stock,
      sizes: p.sizes.map((s: any) => ({ id: s.id, extraPrice: s.extraPrice ?? 0 })),
    }));
  }

  async findToppings(ids: number[]): Promise<CatalogTopping[]> {
    const rows = await (this.prisma as any).topping.findMany({ where: { id: { in: ids } } });
    return rows.map((t: any) => ({ id: t.id, price: t.price, stock: t.stock }));
  }
}
