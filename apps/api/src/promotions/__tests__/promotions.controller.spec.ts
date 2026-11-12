import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PromotionsController } from '../promotions.controller';
import { PromotionsService } from '../promotions.service';
import { CatalogRepository, PromotionRepository } from '../repositories';
import { InMemoryCatalog, InMemoryPromotions, promo } from './fixtures';

describe('POST /promotions/validate (tích hợp, ValidationPipe thật)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [
        PromotionsService,
        { provide: CatalogRepository, useValue: new InMemoryCatalog() },
        { provide: PromotionRepository, useValue: new InMemoryPromotions([promo({ expiresAt: new Date('2099-01-01T00:00:00Z') })]) },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  const post = (body: unknown) => request(app.getHttpServer()).post('/promotions/validate').send(body as object);
  const item = (over: Record<string, unknown> = {}) => ({ productId: 1, sizeId: 1, toppingIds: [1], quantity: 2, ...over });

  it('200 (không phải 201) và báo giá đúng theo hợp đồng', async () => {
    const res = await post({ items: [item({ note: 'ít đá', clientUnitPrice: 50000 })], promotionCode: 'brew2026' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      subtotal: 100000,
      discount: 10000,
      total: 90000,
      promotion: { code: 'BREW2026', valid: true, discountAmount: 10000, reason: null, message: null },
    });
    expect(res.body.items[0]).toMatchObject({
      productId: 1, productName: 'Trà sữa trân châu', status: 'AVAILABLE',
      unitPrice: 50000, lineTotal: 100000, priceChanged: false, unavailableToppingIds: [],
    });
  });

  it('bỏ qua trường giá giả do client gửi (NFR-02)', async () => {
    const res = await post({ items: [item({ unitPrice: 1, price: 1, lineTotal: 1, total: 1 })], total: 1 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].unitPrice).toBe(50000);
    expect(res.body.total).toBe(100000);
  });

  it('clientUnitPrice lệch giá thật thì priceChanged=true nhưng vẫn tính theo giá server', async () => {
    const res = await post({ items: [item({ clientUnitPrice: 1000 })] });
    expect(res.body.items[0]).toMatchObject({ priceChanged: true, unitPrice: 50000 });
  });

  it('mã sai trả 200 với valid=false và lý do', async () => {
    const res = await post({ items: [item()], promotionCode: 'SAIMA' });
    expect(res.status).toBe(200);
    expect(res.body.promotion).toMatchObject({ valid: false, reason: 'PROMO_NOT_FOUND', discountAmount: 0 });
    expect(res.body.total).toBe(100000);
  });

  it('món hết hàng trả 200 với status OUT_OF_STOCK, không tính vào tổng', async () => {
    const res = await post({ items: [item({ productId: 3, toppingIds: [] })] });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ status: 'OUT_OF_STOCK', lineTotal: 0 });
    expect(res.body.total).toBe(0);
  });

  it('400 khi giỏ rỗng, thiếu items hoặc items không phải mảng', async () => {
    for (const body of [{ items: [] }, {}, { items: 'x' }]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    }
    expect((await post({ items: [] })).body.message).toContain('items should not be empty');
  });

  it('400 khi số lượng ngoài 1..10 hoặc không phải số nguyên', async () => {
    for (const q of [0, -1, 11, 1.5, '2']) {
      const res = await post({ items: [item({ quantity: q })] });
      expect(res.status).toBe(400);
    }
  });

  it('400 khi quá 20 dòng; đúng 20 dòng thì chấp nhận', async () => {
    expect((await post({ items: Array.from({ length: 21 }, () => item()) })).status).toBe(400);
    expect((await post({ items: Array.from({ length: 20 }, () => item()) })).status).toBe(200);
  });

  it('400 khi thiếu productId hoặc sizeId, topping trùng hoặc sai kiểu', async () => {
    expect((await post({ items: [{ sizeId: 1, quantity: 1 }] })).status).toBe(400);
    expect((await post({ items: [{ productId: 1, quantity: 1 }] })).status).toBe(400);
    expect((await post({ items: [item({ toppingIds: [1, 1] })] })).status).toBe(400);
    expect((await post({ items: [item({ toppingIds: ['a'] })] })).status).toBe(400);
  });

  it('không cần JWT: không trả 401 hoặc 403', async () => {
    const res = await post({ items: [item()] });
    expect([401, 403]).not.toContain(res.status);
  });
});
