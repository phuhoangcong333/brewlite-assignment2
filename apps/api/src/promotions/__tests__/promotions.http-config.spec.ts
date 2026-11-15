import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../../common/http-exception.filter';
import { PromotionsController } from '../promotions.controller';
import { PromotionsService } from '../promotions.service';
import { CatalogRepository, PromotionRepository } from '../repositories';
import { InMemoryCatalog, InMemoryPromotions, promo } from './fixtures';

/**
 * [S2][Task 5.2][TV3] Issue #25
 *
 * promotions.controller.spec.ts tạo app KHÔNG có pipe/filter toàn cục, trong khi main.ts có:
 *   - ValidationPipe({ whitelist, forbidNonWhitelisted: true, transform })
 *   - HttpExceptionFilter
 * File này dựng app giống main.ts để kiểm tra hành vi THỰC TẾ mà frontend nhận được.
 * (Nếu main.ts đổi, nhớ đổi khối cấu hình bên dưới cho khớp.)
 */
describe('POST /promotions/validate – cấu hình giống main.ts', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [
        PromotionsService,
        { provide: CatalogRepository, useValue: new InMemoryCatalog() },
        {
          provide: PromotionRepository,
          useValue: new InMemoryPromotions([promo({ expiresAt: new Date('2099-01-01T00:00:00Z') })]),
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    // ===== giữ đồng bộ với apps/api/src/main.ts =====
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    // ================================================
    await app.init();
  });
  afterAll(async () => app.close());

  const post = (body: unknown) =>
    request(app.getHttpServer()).post('/promotions/validate').send(body as object);
  const item = (over: Record<string, unknown> = {}) => ({
    productId: 1,
    sizeId: 1,
    toppingIds: [1],
    quantity: 2,
    ...over,
  });

  it('yêu cầu hợp lệ vẫn trả 200 và đúng báo giá', async () => {
    const res = await post({ items: [item({ clientUnitPrice: 50000 })], promotionCode: 'brew2026' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subtotal: 100000, discount: 10000, total: 90000 });
  });

  it('trường giá lạ trong dòng giỏ (price) bị từ chối 400, không bị bỏ qua âm thầm', async () => {
    const res = await post({ items: [item({ price: 1 })] });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.message)).toContain('price');
  });

  it('trường lạ ở cấp ngoài cùng (total) bị từ chối 400', async () => {
    const res = await post({ items: [item()], total: 1 });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.message)).toContain('total');
  });

  it('thông báo lỗi validate theo định dạng của HttpExceptionFilter', async () => {
    const res = await post({ items: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      statusCode: 400,
      message: expect.any(Array),
      path: '/promotions/validate',
      timestamp: expect.any(String),
    });
    // Khác với test controller (không filter): body KHÔNG có trường "error"
    expect(res.body).not.toHaveProperty('error');
    expect(res.body.message).toContain('items should not be empty');
  });

  it('message là MẢNG chuỗi khi nhiều lỗi cùng lúc (frontend cần xử lý)', async () => {
    const res = await post({ items: [{ quantity: 0 }] });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.message)).toBe(true);
    expect(res.body.message.length).toBeGreaterThan(1);
  });
});
