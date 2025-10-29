import { Controller, Get, NotFoundException, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { OrderService } from 'src/modules/order/order.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly ordersService: OrderService) {}

  @Get('success')
  @UseGuards(JwtAuthGuard)
  async success(@Req() req, @Query('orderId') orderId: string) {
    const userId = req.user.userId;
    const order = await this.ordersService.findOne(orderId);

    const orderUserId = (order.user as any)?._id?.toString?.() ?? order.user.toString();
    if (orderUserId !== userId) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Payment succeeded!',
      data: order,
    };
  }

  @Get('cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Req() req, @Query('orderId') orderId: string) {
    const userId = req.user.userId;
    const order = await this.ordersService.findOne(orderId);

    const orderUserId = (order.user as any)?._id?.toString?.() ?? order.user.toString();
    if (orderUserId !== userId) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Payment was canceled.',
      data: order,
    };
  }
}