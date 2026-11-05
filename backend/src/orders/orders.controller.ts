import type { Request } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';
import { OrderService } from './order.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    email: string;
  };
};

@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  getOrders(@Req() req: AuthenticatedRequest) {
    return this.orderService.getOrdersForUser(req.user.sub);
  }

  @Post()
  createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách sản phẩm không được để trống');
    }

    return this.orderService.createOrder(req.user.sub, dto.items);
  }

  @Patch(':id/status')
  async transitionOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionOrderDto,
  ) {
    await this.orderService.transitionOrderForUser(
      id,
      dto.status,
      req.user.sub,
    );

    return {
      id,
      status: dto.status,
    };
  }
}
