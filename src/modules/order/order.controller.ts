import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UpdateOrderDto,
} from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ==================== CREATE ORDER ====================
  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req) {
    const userId = req.user.userId;

    try {
      const order = await this.orderService.createOrder(userId, createOrderDto);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Order created successfully',
        data: order,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to create order',
        data: null,
      };
    }
  }

  // ==================== CREATE ORDER FROM CART ====================
  @Post('from-cart')
  async createOrderFromCart(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req,
  ) {
    const userId = req.user.userId;

    try {
      const order = await this.orderService.createOrderFromCart(
        userId,
        createOrderDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Order created from cart successfully',
        data: order,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to create order from cart',
        data: null,
      };
    }
  }

  // ==================== GET USER ORDERS ====================
  @Get()
  async getOrders(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user.userId;

    try {
      const result = await this.orderService.getOrders(userId, page, limit);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Orders fetched successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch orders',
        data: null,
      };
    }
  }

  // ==================== GET ORDER BY ID ====================
  @Get(':id')
  async getOrderById(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;

    try {
      const order = await this.orderService.getOrderById(userId, id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order fetched successfully',
        data: order,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch order',
        data: null,
      };
    }
  }

  // ==================== UPDATE ORDER STATUS ====================
  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Req() req,
  ) {
    const userId = req.user.userId;

    try {
      const order = await this.orderService.updateOrderStatus(
        userId,
        id,
        updateOrderStatusDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order status updated successfully',
        data: order,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      if (error instanceof BadRequestException) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update order status',
        data: null,
      };
    }
  }

  // ==================== UPDATE PAYMENT STATUS ====================
  @Patch(':id/payment-status')
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
    @Req() req,
  ) {
    const userId = req.user.userId;

    try {
      const order = await this.orderService.updatePaymentStatus(
        userId,
        id,
        updatePaymentStatusDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Payment status updated successfully',
        data: order,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update payment status',
        data: null,
      };
    }
  }

  // ==================== CANCEL ORDER ====================
  @Delete(':id/cancel')
  async cancelOrder(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;

    try {
      const order = await this.orderService.cancelOrder(userId, id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order cancelled successfully',
        data: order,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      if (error instanceof BadRequestException) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to cancel order',
        data: null,
      };
    }
  }

  // ==================== ADMIN ROUTES ====================
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAllOrders(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    try {
      const filters: any = {};
      if (status) filters.status = status;
      if (paymentStatus) filters.paymentStatus = paymentStatus;
      if (paymentMethod) filters.paymentMethod = paymentMethod;

      const result = await this.orderService.getAllOrders(page, limit, filters);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'All orders fetched successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch orders',
        data: null,
      };
    }
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async adminUpdateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    try {
      const order = await this.orderService.adminUpdateOrder(
        id,
        updateOrderDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order updated successfully',
        data: order,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update order',
        data: null,
      };
    }
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getOrderStats() {
    try {
      const stats = await this.orderService.getOrderStats();
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order stats fetched successfully',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch order stats',
        data: null,
      };
    }
  }
}
