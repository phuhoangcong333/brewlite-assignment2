import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { PrismaInventoryRepository } from './prisma-inventory.repository';

@Module({
  imports: [PrismaModule],
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
