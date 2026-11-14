import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrderService } from './order.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrdersModule {}
