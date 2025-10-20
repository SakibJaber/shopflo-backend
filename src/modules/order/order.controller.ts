import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  Patch,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { PaymentStatus } from 'src/common/enum/payment_status.enum';

@Controller('orders')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    try {
      const result = await this.orderService.create(
        req.user.userId,
        createOrderDto,
      );

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Order created successfully',
        data: {
          order: result.order,
          clientSecret: result.clientSecret,
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to create order',
        data: null,
      };
    }
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: OrderStatus,
  ) {
    try {
      const result = await this.orderService.findAll(
        req.user.userId,
        page,
        limit,
        status,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Orders fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch orders',
        data: null,
      };
    }
  }

  @Get('status/:status')
  async findByStatus(
    @Req() req,
    @Param('status') status: OrderStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    try {
      const result = await this.orderService.findOrdersByStatus(
        req.user.userId,
        status,
        page,
        limit,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Orders fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch orders by status',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    try {
      const order = await this.orderService.findOne(req.user.userId, id);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order fetched successfully',
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch order',
        data: null,
      };
    }
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAllAdmin(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('hasDesign') hasDesign?: boolean,
  ) {
    try {
      const result = await this.orderService.findAllAdmin(
        page,
        limit,
        status,
        paymentStatus,
        hasDesign,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Orders fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch orders',
        data: null,
      };
    }
  }

  @Get('admin/with-designs')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findOrdersWithDesigns(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    try {
      const result = await this.orderService.findOrdersWithDesigns(page, limit);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Orders with designs fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch orders with designs',
        data: null,
      };
    }
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findOneAdmin(@Param('id') id: string) {
    try {
      const order = await this.orderService.findOneAdmin(id);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order fetched successfully',
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch order',
        data: null,
      };
    }
  }

  @Get('admin/:id/design-details')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getOrderDesignDetails(@Param('id') id: string) {
    try {
      const orderWithDesigns =
        await this.orderService.getOrderDesignDetails(id);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Order design details fetched successfully',
        data: orderWithDesigns,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch order design details',
        data: null,
      };
    }
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateStatusAdmin(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    try {
      const order = await this.orderService.updateOrderStatusAdmin(
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
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update order status',
        data: null,
      };
    }
  }

  @Patch('admin/:id/tracking')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateTrackingInfo(
    @Param('id') id: string,
    @Body() body: { trackingNumber: string; estimatedDelivery: string },
  ) {
    try {
      const order = await this.orderService.updateTrackingInfo(
        id,
        body.trackingNumber,
        body.estimatedDelivery,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Tracking information updated successfully',
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update tracking information',
        data: null,
      };
    }
  }

  @Get('admin/stats/designs')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getDesignOrderStats() {
    try {
      const stats = await this.orderService.getDesignOrderStats();

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Design order statistics fetched successfully',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch design order statistics',
        data: null,
      };
    }
  }

  @Post('webhook/stripe')
  async handleStripeWebhook(
    @Body() body: any,
    @Query('secret') secret: string,
  ) {
    if (secret !== process.env.STRIPE_WEBHOOK_SECRET) {
      return {
        success: false,
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid webhook secret',
        data: null,
      };
    }

    const { type, data } = body;

    try {
      if (type === 'payment_intent.succeeded') {
        const paymentIntent = data.object;
        const result = await this.orderService.confirmPayment(paymentIntent.id);

        return {
          success: result.success,
          statusCode: HttpStatus.OK,
          message: result.success
            ? 'Payment confirmed successfully'
            : 'Payment failed',
          data: result.order,
        };
      }

      if (type === 'payment_intent.payment_failed') {
        const paymentIntent = data.object;
        await this.orderService.handleFailedPayment(paymentIntent.id);

        return {
          success: false,
          statusCode: HttpStatus.OK,
          message: 'Payment failed handled',
          data: null,
        };
      }

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Webhook processed',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Webhook processing failed',
        data: null,
      };
    }
  }
}
