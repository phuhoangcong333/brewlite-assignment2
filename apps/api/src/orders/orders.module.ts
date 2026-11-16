import { Module } from '@nestjs/common';

import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrderService } from './order.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    InventoryModule,
    PrismaModule,
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrdersModule {}