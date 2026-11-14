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
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';
import { OrderService } from './order.service';
import { OrderIdPipe } from './dto/order-id.pipe';
import { ApiBearerAuth, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    sub?: number;
    email: string;
    role: UserRole;
  };
};

const getUserId = (request: AuthenticatedRequest): number =>
  request.user.id ?? request.user.sub!;

@Controller('orders')
@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  getOrders(@Req() req: AuthenticatedRequest) {
    return this.orderService.getOrdersForUser(getUserId(req));
  }

  @Get('me')
  getMyOrders(@Req() req: AuthenticatedRequest) {
    return this.orderService.getOrdersForUser(getUserId(req));
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF')
  getOrdersForStaff() {
    return this.orderService.getOrdersForStaff();
  }

  @Get(':id')
  getOrderDetail(
    @Req() req: AuthenticatedRequest,
    @Param('id', OrderIdPipe) id: number,
  ) {
    return this.orderService.getOrderForUser(id, getUserId(req));
  }

  @Post()
  createOrder(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách sản phẩm không được để trống');
    }

    return dto.promoCode === undefined
      ? this.orderService.createOrder(getUserId(req), dto.items)
      : this.orderService.createOrder(getUserId(req), dto.items, dto.promoCode);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('STAFF')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Order status updated' })
  async transitionOrder(
    @Param('id', OrderIdPipe) id: number,
    @Body() dto: TransitionOrderDto,
  ) {
    await this.orderService.transitionOrderForStaff(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id', OrderIdPipe) id: number,
  ) {
    await this.orderService.transitionOrderForUser(
      id,
      'CANCELLED',
      getUserId(req),
    );
  }

  @Delete('staff/:id')
  @UseGuards(RolesGuard)
  @Roles('STAFF')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOrderForStaff(@Param('id', OrderIdPipe) id: number) {
    await this.orderService.transitionOrderForStaff(id, 'CANCELLED');
  }
}
