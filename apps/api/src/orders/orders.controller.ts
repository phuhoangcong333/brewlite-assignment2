import type { Request } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt.guard';
import { StaffGuard } from '../auth/staff.guard';
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

  @Get('me')
  getMyOrders(@Req() req: AuthenticatedRequest) {
    return this.orderService.getOrdersForUser(req.user.sub);
  }

  @Get('staff')
  @UseGuards(StaffGuard)
  getOrdersForStaff() {
    return this.orderService.getOrdersForStaff();
  }

  /** API Contract 4.10 — ownership enforced by user id from JWT. */
  @Get(':id')
  getOrderById(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (id < 1) {
      throw new BadRequestException('Order id must be positive');
    }
    return this.orderService.getOrderForUser(id, req.user.sub);
  }

  @Post()
  createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách sản phẩm không được để trống');
    }


    return dto.promoCode === undefined
      ? this.orderService.createOrder(req.user.sub, dto.items)
      : this.orderService.createOrder(req.user.sub, dto.items, dto.promoCode);
  }

  @Patch(':id/status')
  @UseGuards(StaffGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async transitionOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionOrderDto,
  ) {
    if (id < 1) {
      throw new BadRequestException('Order id must be positive');
    }
    await this.orderService.transitionOrderForStaff(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.orderService.transitionOrderForUser(
      id,
      'CANCELLED',
      req.user.sub,
    );
  }
}
