import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpStatus,
  Headers,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { ConfigService } from '@nestjs/config';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/enum/user_role.enum';
import { PaymentMethod, PaymentStatus } from 'src/common/enum/payment.enum';
import { CartService } from 'src/modules/cart/cart.service';
import { v4 as uuidv4 } from 'uuid';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { Roles } from 'src/common/decorator/roles.decorator';
import { StripeService } from 'src/modules/order/payment/stripe.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrderService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
  ) {}

  @Post()
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async placeOrder(
    @Req() req,
    @Body() createOrderDto: CreateOrderDto,
    @Headers('Idempotency-Key') headerKey: string,
  ) {
    const userId = req.user.userId;

    // Validate payment method
    if (createOrderDto.paymentMethod !== PaymentMethod.STRIPE) {
      throw new BadRequestException('Only Stripe payments are accepted');
    }

    // Generate idempotency key
    const idempotencyKey = headerKey || createOrderDto.idempotencyKey || uuidv4();
    createOrderDto.idempotencyKey = idempotencyKey;

    // Create order
    const order = await this.ordersService.create(userId, createOrderDto);

    // Create Stripe checkout session
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const successUrl = `${frontendUrl}/checkout/success?orderId=${order._id}`;
    const cancelUrl = `${frontendUrl}/checkout/cancel?orderId=${order._id}`;

    // Prepare line items for Stripe
    const lineItems = order.items.flatMap(item =>
      item.variantQuantities.flatMap(vq =>
        vq.sizeQuantities.map(sq => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: (item as any).product?.productName || 'Product',
              description: `Size: ${sq.size} - Quantity: ${sq.quantity}`,
              // images: item.isDesignItem && (item as any).design?.frontImage 
              //   ? [(item as any).design.frontImage] 
              //   : [(item as any).product?.thumbnail],
            },
            unit_amount: Math.round(sq.price * 100),
          },
          quantity: sq.quantity,
        }))
      )
    );

    const session = await this.stripeService.createCheckoutSession({
      orderId: order._id.toString(),
      lineItems,
      customerEmail: req.user.email,
      successUrl,
      cancelUrl,
    });

    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Order placed successfully. Payment required.',
      data: {
        order,
        payment: {
          type: 'stripe',
          sessionId: session.id,
          url: session.url,
        },
      },
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    let orderStatus: OrderStatus | undefined;
    if (status) {
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        throw new BadRequestException(`Invalid status value: ${status}`);
      }
      orderStatus = status as OrderStatus;
    }

    const result = await this.ordersService.findAll(page, limit, search, orderStatus);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Orders fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('my-orders')
  async getUserOrders(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId = req.user.userId;
    const result = await this.ordersService.getOrdersByUser(userId, page, limit);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User orders fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('summary')
  async getOrderSummary(@Req() req) {
    const userId = req.user.userId;
    const summary = await this.ordersService.getOrderSummary(userId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Order summary fetched successfully',
      data: summary,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Order fetched successfully',
      data: order,
    };
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    const allowedStatuses = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];

    if (!allowedStatuses.includes(updateOrderStatusDto.status)) {
      throw new BadRequestException('Invalid order status');
    }

    const order = await this.ordersService.updateStatus(id, updateOrderStatusDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Order status updated successfully',
      data: order,
    };
  }

  @Post(':id/retry-payment')
  async retryPayment(@Req() req, @Param('id') orderId: string) {
    const userId = req.user.userId;
    const order = await this.ordersService.findOne(orderId);

    const ownerId = (order.user as any)?._id?.toString?.() ?? order.user.toString();
    if (ownerId !== userId) throw new NotFoundException('Order not found');

    if (order.paymentStatus === PaymentStatus.SUCCEEDED) {
      throw new ConflictException('Payment already succeeded');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const successUrl = `${frontendUrl}/checkout/success?orderId=${order._id}`;
    const cancelUrl = `${frontendUrl}/checkout/cancel?orderId=${order._id}`;

    const lineItems = order.items.flatMap(item =>
      item.variantQuantities.flatMap(vq =>
        vq.sizeQuantities.map(sq => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: (item as any).product?.productName || 'Product',
              description: `Size: ${sq.size} - Quantity: ${sq.quantity}`,
            },
            unit_amount: Math.round(sq.price * 100),
          },
          quantity: sq.quantity,
        }))
      )
    );

    const session = await this.stripeService.createCheckoutSession({
      orderId: order._id.toString(),
      lineItems,
      customerEmail: req.user.email,
      successUrl,
      cancelUrl,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Payment session created successfully',
      data: {
        sessionId: session.id,
        url: session.url,
      },
    };
  }
}