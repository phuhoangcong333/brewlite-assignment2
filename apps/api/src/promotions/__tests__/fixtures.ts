import { CatalogProduct, CatalogTopping, Promotion } from '../promotion.types';
import { CatalogRepository, PromotionRepository } from '../repositories';

export const PRODUCTS: CatalogProduct[] = [
  {
    id: 1,
    name: 'Trà sữa trân châu',
    imageUrl: '/images/tra-sua.jpg',
    basePrice: 45000,
    sizes: [
      { id: 1, extraPrice: 0, stock: 20 },
      { id: 2, extraPrice: 6000, stock: 20 },
      { id: 3, extraPrice: 10000, stock: 2 },
    ],
  },
  {
    id: 2,
    name: 'Hồng trà',
    imageUrl: null,
    basePrice: 30000,
    sizes: [{ id: 1, extraPrice: 0, stock: 5 }],
  },
  {
    id: 3,
    name: 'Cà phê sữa',
    imageUrl: '/images/ca-phe-sua.jpg',
    basePrice: 35000,
    sizes: [{ id: 1, extraPrice: 0, stock: 0 }],
  },
];

export const TOPPINGS: CatalogTopping[] = [
  { id: 'pearl', price: 5000, stock: 50 },
  { id: 'cream', price: 7000, stock: 50 },
  { id: 'syrup', price: 6000, stock: 0 },
];

export const T = (iso: string) => new Date(iso);
export const NOW = T('2026-11-08T10:00:00Z');

export const promo = (over: Partial<Promotion> = {}): Promotion => ({
  id: 1,
  code: 'BREW2026',
  description: null,
  discountType: 'PERCENT',
  discountValue: 10,
  maxDiscountAmount: null,
  minOrderValue: 0,
  startsAt: T('2026-11-01T00:00:00Z'),
  expiresAt: T('2026-12-31T23:59:59Z'),
  usageLimit: null,
  usedCount: 0,
  isActive: true,
  ...over,
});

export class InMemoryCatalog extends CatalogRepository {
  async findProducts(ids: number[]) {
    return PRODUCTS.filter((p) => ids.includes(p.id));
  }
  async findToppings(ids: string[]) {
    return TOPPINGS.filter((t) => ids.includes(t.id));
  }
}

export class InMemoryPromotions extends PromotionRepository {
  constructor(private readonly list: Promotion[] = [promo()]) {
    super();
  }
  readonly lookups: string[] = [];
  async findByCode(code: string) {
    this.lookups.push(code);
    return this.list.find((p) => p.code === code) ?? null;
  }
}
