import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { CartService } from 'src/modules/cart/cart.service';
import { PaymentService } from 'src/modules/payment/payment.service';
import { AddressService } from 'src/modules/address/address.service';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { PaymentStatus } from 'src/common/enum/payment_status.enum';
import { DesignsService } from 'src/modules/designs/designs.service';

type CartDetailItem = {
  _id: string;
  product: {
    _id: string;
    productName: string;
    brand: string;
    price: number;
    discountedPrice: number;
    thumbnail: string;
  };
  design?: {
    _id: string;
    designName: string;
    frontImage?: string;
    backImage?: string;
    leftImage?: string;
    rightImage?: string;
  } | null;
  variant: { _id: string; color: any };
  sizeQuantities: Array<{ size: string; sizeName: string; quantity: number }>;
  price: number;
  total: number;
  displayImages: {
    frontImage?: string;
    backImage?: string;
    leftImage?: string;
    rightImage?: string;
  };
  isSelected: boolean;
  color: string; // from your getCartWithDetails: item.colorName
  isDesignItem: boolean;
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  // env-configurable pricing rules (fallback defaults used if env not set)
  private readonly TAX_RATE = Number(process.env.TAX_RATE ?? 0); // e.g., 0.1 for 10%
  private readonly SHIPPING_FLAT = Number(process.env.SHIPPING_FLAT ?? 0); // e.g., 499 for cents or 4.99 if using major units
  private readonly FREE_SHIPPING_OVER = Number(
    process.env.FREE_SHIPPING_OVER ?? 0,
  );

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly paymentService: PaymentService,
    private readonly cartService: CartService,
    private readonly addressService: AddressService,
    private readonly designService: DesignsService,
  ) {}

  // ---------- helpers ----------
  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private computeTotals(items: Array<{ lineTotal: number }>) {
    const itemsTotal = this.round2(
      items.reduce((s, it) => s + (it.lineTotal || 0), 0),
    );

    const shippingFee =
      this.FREE_SHIPPING_OVER && itemsTotal >= this.FREE_SHIPPING_OVER
        ? 0
        : this.round2(this.SHIPPING_FLAT || 0);

    const taxAmount = this.round2(itemsTotal * (this.TAX_RATE || 0));
    const totalAmount = this.round2(itemsTotal + shippingFee + taxAmount);

    return { itemsTotal, shippingFee, taxAmount, totalAmount };
  }

  private mapCartItemToOrderItem(item: CartDetailItem) {
    // Prefer design images; fall back to variant images already in displayImages
    const images = item.displayImages || {};
    const designData = item.design
      ? {
          designName: item.design.designName,
          frontImage: item.design.frontImage,
          backImage: item.design.backImage,
          leftImage: item.design.leftImage,
          rightImage: item.design.rightImage,
        }
      : undefined;

    return {
      product: new Types.ObjectId(item.product._id),
      design: item.design ? new Types.ObjectId(item.design._id) : undefined,
      variant: new Types.ObjectId(item.variant._id),
      sizeQuantities: item.sizeQuantities.map((sq) => ({
        size: new Types.ObjectId(sq.size),
        sizeName: sq.sizeName,
        quantity: sq.quantity,
      })),
      price: item.price, // price per unit (discountedPrice from cart)
      color: item.color, // color name from cart
      frontImage: images.frontImage || '',
      backImage: images.backImage,
      leftImage: images.leftImage,
      rightImage: images.rightImage,
      designData,
      hasDesign: !!item.isDesignItem,
      productSnapshot: {
        productName: item.product.productName,
        brand: item.product.brand,
        price: item.product.price,
        discountedPrice: item.product.discountedPrice,
        thumbnail: item.product.thumbnail,
      },
      // not persisted here: lineTotal, we compute totals separately
      __lineTotal: item.total, // internal helper
    };
  }

  private chooseCartItems(all: CartDetailItem[], selectedOnly?: boolean) {
    if (selectedOnly) {
      const sel = all.filter((i) => i.isSelected);
      // If user asked selectedOnly but none selected, this is a user error.
      if (sel.length === 0) {
        throw new BadRequestException('No selected items in cart.');
      }
      return sel;
    }
    // If not selectedOnly, but some are selected, many shops prefer to
    // order only selected. We’ll match the cart UX you’ve built:
    const selected = all.filter((i) => i.isSelected);
    return selected.length ? selected : all;
  }

  // ---------- service methods ----------

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      // 1) Validate address belongs to the user
      const address = await this.addressService.findOne(
        userId,
        createOrderDto.shippingAddress,
      );

      const addressSnapshot = {
        fullName: address.fullName,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        phone: address.phone,
      };

      // 2) Load cart details and decide which items to order
      const cartDetails = await this.cartService.getCartWithDetails(userId);
      const cartItems: CartDetailItem[] = cartDetails.items as any;

      if (!cartItems.length) {
        throw new BadRequestException('Cart is empty.');
      }

      const useSelectedOnly =
        createOrderDto.orderSelectedOnly === undefined
          ? true
          : !!createOrderDto.orderSelectedOnly;

      const itemsChosen = this.chooseCartItems(cartItems, useSelectedOnly);

      // 3) Map to order items and compute totals safely on server
      const mapped = itemsChosen.map((it) => this.mapCartItemToOrderItem(it));

      const itemCount = mapped.length;
      const totalQuantity = itemsChosen.reduce(
        (sum, it) =>
          sum +
          it.sizeQuantities.reduce((s, sq) => s + Number(sq.quantity || 0), 0),
        0,
      );
      const designItemCount = itemsChosen.filter((i) => i.isDesignItem).length;

      const { itemsTotal, shippingFee, taxAmount, totalAmount } =
        this.computeTotals(
          mapped.map((it: any) => ({ lineTotal: it.__lineTotal || 0 })),
        );

      // 4) Create payment intent
      const paymentIntent = await this.paymentService.createPaymentIntent(
        totalAmount,
        {
          userId,
          orderType: 'order',
          itemCount: String(itemCount),
          totalQuantity: String(totalQuantity),
          designItems: String(designItemCount),
        },
      );

      // 5) Persist order (strip internal helper field)
      const sanitizedItems = mapped.map((it: any) => {
        const { __lineTotal, ...rest } = it;
        return rest;
      });

      const order = new this.orderModel({
        user: new Types.ObjectId(userId),
        shippingAddress: new Types.ObjectId(createOrderDto.shippingAddress),
        items: sanitizedItems,
        itemsTotal,
        shippingFee,
        taxAmount,
        totalAmount,
        paymentMethod: createOrderDto.paymentMethod,
        stripePaymentIntentId: paymentIntent.id,
        itemCount,
        totalQuantity,
        designItemCount,
        shippingAddressSnapshot: addressSnapshot,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      });

      const savedOrder = await order.save({ session });

      // 6) Clear cart after order creation
      try {
        await this.cartService.clearCart(userId);
        this.logger.log(`Cart cleared for user ${userId} after order creation`);
      } catch (clearErr: any) {
        this.logger.error(
          `Failed to clear cart for user ${userId}: ${clearErr.message}`,
          clearErr.stack,
        );
        // Not fatal to the order — do not throw
      }

      await session.commitTransaction();

      this.logger.log(
        `Order created: ${savedOrder._id} (user ${userId}) — items: ${itemCount}, qty: ${totalQuantity}, designItems: ${designItemCount}`,
      );

      return {
        order: savedOrder,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to create order for user ${userId}: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create order: ${error.message}`,
      );
    } finally {
      session.endSession();
    }
  }

  async findAll(userId: string, page = 1, limit = 10, status?: OrderStatus) {
    try {
      const skip = (page - 1) * limit;
      const query: any = { user: new Types.ObjectId(userId) };

      if (status) query.status = status;

      const [orders, total] = await Promise.all([
        this.orderModel
          .find(query)
          .populate('shippingAddress')
          .populate({
            path: 'items.product',
            select: 'productName brand thumbnail',
          })
          .populate({
            path: 'items.design',
            select: 'designName frontImage',
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.orderModel.countDocuments(query),
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
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch orders');
    }
  }

  async findOne(userId: string, id: string) {
    try {
      const order = await this.orderModel
        .findOne({
          _id: new Types.ObjectId(id),
          user: new Types.ObjectId(userId),
        })
        .populate('shippingAddress')
        .populate({
          path: 'items.product',
          select: 'productName brand thumbnail',
        })
        .populate({
          path: 'items.design',
          select: 'designName frontImage',
        })
        .exec();

      if (!order) throw new NotFoundException('Order not found');

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error(
        `Failed to fetch order ${id} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch order');
    }
  }

  async findOneAdmin(id: string) {
    try {
      const order = await this.orderModel
        .findById(new Types.ObjectId(id))
        .populate('shippingAddress')
        .populate({
          path: 'items.product',
          select: 'productName brand thumbnail price discountedPrice variants',
        })
        .populate({
          path: 'items.design',
          select:
            'designName frontImage backImage leftImage rightImage frontElement backElement leftElement rightElement',
        })
        .populate({
          path: 'user',
          select: 'firstName lastName email phone',
        })
        .exec();

      if (!order) throw new NotFoundException('Order not found');

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error(
        `Failed to fetch order ${id} for admin: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch order');
    }
  }

  async getOrderDesignDetails(id: string) {
    try {
      const order = await this.orderModel
        .findById(new Types.ObjectId(id))
        .populate('shippingAddress')
        .populate({
          path: 'items.product',
          select: 'productName brand thumbnail',
        })
        .populate({
          path: 'items.design',
          select:
            'designName frontImage backImage leftImage rightImage frontElement backElement leftElement rightElement designPreferences',
        })
        .populate({
          path: 'user',
          select: 'firstName lastName email phone',
        })
        .exec();

      if (!order) throw new NotFoundException('Order not found');

      const enhancedItems = await Promise.all(
        order.items.map(async (item: any) => {
          if (item.design) {
            const designDetails = await this.designService.findOne(
              item.design._id.toString(),
            );

            return {
              ...item.toObject(),
              design: designDetails,
              hasDesign: true,
              designImages: {
                front: item.designData?.frontImage || item.design.frontImage,
                back: item.designData?.backImage || item.design.backImage,
                left: item.designData?.leftImage || item.design.leftImage,
                right: item.designData?.rightImage || item.design.rightImage,
              },
              designElements: {
                front:
                  item.designData?.frontElement || item.design.frontElement,
                back: item.designData?.backElement || item.design.backElement,
                left: item.designData?.leftElement || item.design.leftElement,
                right:
                  item.designData?.rightElement || item.design.rightElement,
              },
            };
          }

          return {
            ...item.toObject(),
            hasDesign: false,
            designImages: null,
            designElements: null,
          };
        }),
      );

      return {
        ...order.toObject(),
        items: enhancedItems,
        designSummary: {
          totalItems: order.items.length,
          designItems: order.items.filter((it) => it.hasDesign).length,
          regularItems: order.items.filter((it) => !it.hasDesign).length,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error(
        `Failed to fetch order design details ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch order design details',
      );
    }
  }

  async findOrdersByStatus(
    userId: string,
    status: OrderStatus,
    page = 1,
    limit = 10,
  ) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.orderModel
          .find({
            user: new Types.ObjectId(userId),
            status,
          })
          .populate('shippingAddress')
          .populate({
            path: 'items.product',
            select: 'productName brand thumbnail',
          })
          .populate({
            path: 'items.design',
            select: 'designName frontImage',
          })
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
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders by status for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch orders by status',
      );
    }
  }

  async findAllAdmin(
    page = 1,
    limit = 10,
    status?: OrderStatus,
    paymentStatus?: PaymentStatus,
    hasDesign?: boolean,
  ) {
    try {
      const skip = (page - 1) * limit;
      const query: any = {};

      if (status) query.status = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;

      if (hasDesign !== undefined) {
        query.designItemCount = hasDesign ? { $gt: 0 } : 0;
      }

      const [orders, total] = await Promise.all([
        this.orderModel
          .find(query)
          .populate('shippingAddress')
          .populate({
            path: 'items.product',
            select: 'productName brand thumbnail',
          })
          .populate({
            path: 'items.design',
            select: 'designName frontImage',
          })
          .populate({
            path: 'user',
            select: 'firstName lastName email',
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.orderModel.countDocuments(query),
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
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders for admin: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch orders');
    }
  }

  async findOrdersWithDesigns(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.orderModel
          .find({ designItemCount: { $gt: 0 } })
          .populate('shippingAddress')
          .populate({
            path: 'items.product',
            select: 'productName brand thumbnail',
          })
          .populate({
            path: 'items.design',
            select: 'designName frontImage backImage leftImage rightImage',
          })
          .populate({
            path: 'user',
            select: 'firstName lastName email',
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.orderModel.countDocuments({ designItemCount: { $gt: 0 } }),
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
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders with designs: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch orders with designs',
      );
    }
  }

  async confirmPayment(paymentIntentId: string) {
    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findOne({
        stripePaymentIntentId: paymentIntentId,
      });

      if (!order) throw new NotFoundException('Order not found');

      const payment = await this.paymentService.confirmPayment(paymentIntentId);

      if (payment.status === 'succeeded') {
        order.paymentStatus = PaymentStatus.PAID;
        // Only auto-advance if it was still pending (idempotency safety)
        if (order.status === OrderStatus.PENDING) {
          order.status = OrderStatus.CONFIRMED;
        }
        await order.save({ session });

        await session.commitTransaction();
        this.logger.log(`Payment confirmed for order ${order._id}`);

        return { success: true, order };
      } else {
        order.paymentStatus = PaymentStatus.FAILED;
        order.status = OrderStatus.CANCELLED;
        await order.save({ session });

        await session.commitTransaction();
        this.logger.warn(`Payment failed for order ${order._id}`);

        return { success: false, order };
      }
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to confirm payment for intent ${paymentIntentId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      session.endSession();
    }
  }

  async handleFailedPayment(paymentIntentId: string) {
    try {
      const order = await this.orderModel.findOne({
        stripePaymentIntentId: paymentIntentId,
      });

      if (order) {
        order.paymentStatus = PaymentStatus.FAILED;
        order.status = OrderStatus.CANCELLED;
        await order.save();

        this.logger.log(`Order ${order._id} cancelled due to failed payment`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle failed payment for intent ${paymentIntentId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async updateOrderStatusAdmin(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    try {
      const order = await this.orderModel.findById(id);
      if (!order) throw new NotFoundException('Order not found');

      order.status = updateOrderStatusDto.status;

      if (updateOrderStatusDto.trackingNumber) {
        order.trackingNumber = updateOrderStatusDto.trackingNumber;
      }
      if (updateOrderStatusDto.estimatedDelivery) {
        order.estimatedDelivery = new Date(
          updateOrderStatusDto.estimatedDelivery,
        );
      }

      await order.save();
      this.logger.log(
        `Order ${id} status updated to ${updateOrderStatusDto.status} by admin`,
      );
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error(
        `Failed to update order status for order ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update order status');
    }
  }

  async updateTrackingInfo(
    id: string,
    trackingNumber: string,
    estimatedDelivery: string,
  ) {
    try {
      const order = await this.orderModel.findById(id);
      if (!order) throw new NotFoundException('Order not found');

      order.trackingNumber = trackingNumber;
      order.estimatedDelivery = new Date(estimatedDelivery);

      if (order.status === OrderStatus.CONFIRMED) {
        order.status = OrderStatus.PROCESSING;
      }

      await order.save();
      this.logger.log(`Tracking info updated for order ${id}`);
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error(
        `Failed to update tracking info for order ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update tracking information',
      );
    }
  }

  async getDesignOrderStats() {
    try {
      const stats = await this.orderModel.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            ordersWithDesigns: {
              $sum: { $cond: [{ $gt: ['$designItemCount', 0] }, 1, 0] },
            },
            totalDesignItems: { $sum: '$designItemCount' },
            totalRevenue: { $sum: '$totalAmount' },
            designOrderRevenue: {
              $sum: {
                $cond: [{ $gt: ['$designItemCount', 0] }, '$totalAmount', 0],
              },
            },
          },
        },
      ]);

      const monthlyStats = await this.orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            ordersWithDesigns: {
              $sum: { $cond: [{ $gt: ['$designItemCount', 0] }, 1, 0] },
            },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return {
        overview: stats[0] || {
          totalOrders: 0,
          ordersWithDesigns: 0,
          totalDesignItems: 0,
          totalRevenue: 0,
          designOrderRevenue: 0,
        },
        monthlyTrend: monthlyStats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch design order statistics: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch design order statistics',
      );
    }
  }
}
