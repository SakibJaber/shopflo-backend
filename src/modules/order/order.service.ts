import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { CartService } from 'src/modules/cart/cart.service';
import { PaymentService } from 'src/modules/payment/payment.service';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { PaymentStatus } from 'src/common/enum/payment_status.enum';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly paymentService: PaymentService,
    private readonly cartService: CartService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    try {
      const paymentIntent = await this.paymentService.createPaymentIntent(
        createOrderDto.totalAmount,
        {
          userId,
          orderDetails: JSON.stringify(createOrderDto),
        },
      );

      const order = new this.orderModel({
        ...createOrderDto,
        user: new Types.ObjectId(userId),
        stripePaymentIntentId: paymentIntent.id,
        items: createOrderDto.items.map((item) => ({
          ...item,
          product: new Types.ObjectId(item.product),
          variant: new Types.ObjectId(item.variant),
        })),
      });

      const savedOrder = await order.save();

      try {
        await this.cartService.clearCart(userId);
      } catch (clearError) {
        console.error('Failed to clear cart after order creation:', clearError);
      }

      return {
        order: savedOrder,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create order: ${error.message}`,
      );
    }
  }

  async findAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ user: new Types.ObjectId(userId) })
        .populate('shippingAddress')
        .populate(
          'items.product',
          'productName brand price discountPercentage discountedPrice',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ user: new Types.ObjectId(userId) }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .populate('shippingAddress')
      .populate(
        'items.product',
        'productName brand price discountPercentage discountedPrice',
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async confirmPayment(paymentIntentId: string) {
    const order = await this.orderModel.findOne({
      stripePaymentIntentId: paymentIntentId,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = await this.paymentService.confirmPayment(paymentIntentId);

    if (payment.status === 'succeeded') {
      order.paymentStatus = PaymentStatus.PAID;
      order.status = OrderStatus.CONFIRMED;
      await order.save();

      return { success: true, order };
    } else {
      order.paymentStatus = PaymentStatus.FAILED;
      await order.save();

      return { success: false, order };
    }
  }

  async findOrdersByStatus(
    userId: string,
    status: OrderStatus,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({
          user: new Types.ObjectId(userId),
          status,
        })
        .populate('shippingAddress')
        .populate(
          'items.product',
          'productName brand price discountPercentage discountedPrice',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({
        user: new Types.ObjectId(userId),
        status,
      }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
