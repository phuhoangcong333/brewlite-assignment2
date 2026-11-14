import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { PrismaInventoryRepository } from './prisma-inventory.repository';
import { IngredientsController } from './ingredients.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IngredientsController],
  providers: [
    PrismaInventoryRepository,
    {
      provide: InventoryRepository,
      useExisting: PrismaInventoryRepository,
    },
    InventoryService,
    RecipesService,
  ],
  exports: [InventoryService, PrismaInventoryRepository, RecipesService],
})
export class InventoryModule {}
