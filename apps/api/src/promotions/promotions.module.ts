import { Module } from '@nestjs/common';
import { PrismaCatalogRepository } from './adapters/prisma-catalog.repository';
import { PrismaPromotionRepository } from './adapters/prisma-promotion.repository';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { CatalogRepository, PromotionRepository } from './repositories';

/** Cần PrismaService (global module) do TV7/nền tảng cung cấp. */
@Module({
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    { provide: CatalogRepository, useClass: PrismaCatalogRepository },
    { provide: PromotionRepository, useClass: PrismaPromotionRepository },
  ],
  exports: [PromotionsService],
})
export class PromotionsModule {}
