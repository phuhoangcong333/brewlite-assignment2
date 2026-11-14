import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { PrismaInventoryRepository } from './prisma-inventory.repository';
import { IngredientsController } from './ingredients.controller';
import { ToppingsController } from './toppings.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IngredientsController, ToppingsController],
  providers: [
    PrismaInventoryRepository,
    {
      provide: InventoryRepository,
      useExisting: PrismaInventoryRepository,
    },
    InventoryService,
  ],
  exports: [InventoryService, PrismaInventoryRepository],
})
export class InventoryModule {}