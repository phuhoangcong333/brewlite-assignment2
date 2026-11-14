import { Size } from '@prisma/client';

export const PRODUCT_SIZE_OPTIONS = [
  { id: 1, code: Size.S, additionalPrice: 0 },
  { id: 2, code: Size.M, additionalPrice: 5_000 },
  { id: 3, code: Size.L, additionalPrice: 10_000 },
] as const;