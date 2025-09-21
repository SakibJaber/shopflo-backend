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
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { OrderStatus } from 'src/common/enum/order_status.enum';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Req() req, @Body() createOrderDto: CreateOrderDto) {
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
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.orderService.findAll(
      req.user.userId,
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
  }

  @Get('status/:status')
  async findByStatus(
    @Req() req,
    @Param('status') status: OrderStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
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
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    const order = await this.orderService.findOne(req.user.userId, id);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Order fetched successfully',
      data: order,
    };
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
      };
    }

    const { type, data } = body;

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

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Webhook processed',
    };
  }
}
