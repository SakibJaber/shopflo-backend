// src/modules/order/order.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
} from './schema/order.schema';
import { Cart, CartDocument } from '../cart/schema/cart.schema';
import { Product, ProductDocument } from '../products/schema/product.schema';
import { Design, DesignDocument } from '../designs/schema/design.schema';

import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UpdateOrderDto,
} from './dto/create-order.dto';

import {
  Address,
  AddressDocument,
} from 'src/modules/address/schema/address.schema';

import { NotificationPriority } from '../notifications/schema/notification.schema';

import { NotificationService } from 'src/modules/notifications/notifications.service';
import { NotificationType } from 'src/common/enum/notification_type.enum';
import { CreateNotificationDto } from 'src/modules/notifications/dto/create-notification.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Design.name)
    private readonly designModel: Model<DesignDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // ==================== CREATE ORDER ====================
  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDocument> {
    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      // Validate shipping address (inside the session)
      const address = await this.addressModel.findOne(
        {
          _id: new Types.ObjectId(createOrderDto.shippingAddress),
          user: new Types.ObjectId(userId),
          isActive: true,
        },
        null,
        { session },
      );

      if (!address) {
        throw new NotFoundException('Shipping address not found');
      }

      // Calculate order totals and validate items
      let itemsPrice = 0;
      const orderItems: Array<{
        product: Types.ObjectId;
        design?: Types.ObjectId;
        variantQuantities: Array<{
          variant: Types.ObjectId;
          sizeQuantities: Array<{
            size: Types.ObjectId;
            quantity: number;
            price: number;
          }>;
        }>;
        price: number;
        designData?: any;
        isDesignItem: boolean;
        discount: number;
      }> = [];

      for (const itemDto of createOrderDto.items) {
        // Load product within session
        const product = await this.productModel.findById(
          itemDto.product,
          null,
          { session },
        );
        if (!product) {
          throw new NotFoundException(`Product ${itemDto.product} not found`);
        }

        // Validate design if provided (within session)
        if (itemDto.design) {
          const design = await this.designModel.findOne(
            {
              _id: new Types.ObjectId(itemDto.design),
              user: new Types.ObjectId(userId),
              isActive: true,
            },
            null,
            { session },
          );
          if (!design) {
            throw new NotFoundException(`Design ${itemDto.design} not found`);
          }
        }

        // Calculate item total and validate variants
        let itemTotal = 0;
        const variantQuantities: Array<{
          variant: Types.ObjectId;
          sizeQuantities: Array<{
            size: Types.ObjectId;
            quantity: number;
            price: number;
          }>;
        }> = [];

        for (const variantDto of itemDto.variantQuantities) {
          const productVariant = (product.variants as any)?.find(
            (v: any) => v._id?.toString() === variantDto.variant,
          );

          if (!productVariant) {
            throw new NotFoundException(
              `Variant ${variantDto.variant} not found in product`,
            );
          }

          const sizeQuantities: Array<{
            size: Types.ObjectId;
            quantity: number;
            price: number;
          }> = [];

          for (const sizeQty of variantDto.sizeQuantities) {
            // Validate size exists in variant
            const sizeExists = productVariant.size?.some(
              (s: any) => s._id?.toString() === sizeQty.size.toString(),
            );

            if (!sizeExists) {
              throw new BadRequestException(
                `Size ${sizeQty.size} not available for variant ${variantDto.variant}`,
              );
            }

            // Compute price; fallback to product.price if discountedPrice missing
            const fallbackPrice =
              (product as any).discountedPrice ?? (product as any).price ?? 0;

            const itemPrice = sizeQty.price ?? fallbackPrice;
            const itemSubtotal = itemPrice * sizeQty.quantity;
            itemTotal += itemSubtotal;

            sizeQuantities.push({
              size: new Types.ObjectId(sizeQty.size),
              quantity: sizeQty.quantity,
              price: itemPrice,
            });
          }

          variantQuantities.push({
            variant: new Types.ObjectId(variantDto.variant),
            sizeQuantities,
          });
        }

        itemsPrice += itemTotal;

        orderItems.push({
          product: new Types.ObjectId(itemDto.product),
          design: itemDto.design
            ? new Types.ObjectId(itemDto.design)
            : undefined,
          variantQuantities,
          price: itemDto.price,
          designData: itemDto.designData,
          isDesignItem: itemDto.isDesignItem || false,
          discount: itemDto.discount || 0,
        });
      }

      // Totals (example logic)
      const taxPrice = itemsPrice * 0.1; // 10% tax example
      const shippingPrice = itemsPrice > 100 ? 0 : 10; // Free shipping over $100
      const totalPrice = itemsPrice + taxPrice + shippingPrice;

      // Create order (in session)
      const order = new this.orderModel({
        user: new Types.ObjectId(userId),
        items: orderItems,
        shippingAddress: new Types.ObjectId(createOrderDto.shippingAddress),
        paymentMethod: createOrderDto.paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        trackingNumber: createOrderDto.trackingNumber,
        shippingCarrier: createOrderDto.shippingCarrier,
      });

      const savedOrder = await order.save({ session });

      // Clear user's cart after successful order
      await this.cartModel.updateOne(
        { user: new Types.ObjectId(userId), isActive: true },
        { $set: { items: [] } },
        { session },
      );

      await session.commitTransaction();

      // Re-fetch with populations as a Document (no lean)
      const populatedOrder = await this.orderModel
        .findById(savedOrder._id)
        .populate('user', 'name email')
        .populate('shippingAddress')
        .populate({
          path: 'items.product',
          select: 'name images price',
        })
        .populate({
          path: 'items.design',
          select: 'name previewImage',
        })
        .exec();

      if (!populatedOrder) {
        throw new NotFoundException('Order not found');
      }

      // Stringify saved order id safely
      const orderIdStr = (savedOrder._id as Types.ObjectId).toString();

      // 🔔 NOTIFICATION: Notify admins about new order
      try {
        const adminUsers = await this.getAdminUsers();
        const adminIds = adminUsers.map((admin) =>
          (admin as any)?._id?.toString(),
        );

        await this.notificationService.notifyOrderCreated({
          orderId: orderIdStr,
          customerId: userId,
          customerName: (populatedOrder.user as any)?.name || 'Customer',
          totalAmount: totalPrice,
          adminIds: adminIds.filter(Boolean) as string[],
        });
      } catch (notificationError) {
        this.logger.error(
          'Failed to send order creation notification:',
          notificationError,
        );
      }

      // 🔔 NOTIFICATION: Notify customer about order confirmation
      try {
        await this.notificationService.createNotification({
          recipient: userId,
          title: 'Order Confirmed',
          message: `Your order #${orderIdStr} has been confirmed and is being processed.`,
          type: NotificationType.ORDER_CREATED,
          priority: NotificationPriority.MEDIUM,
          metadata: {
            orderId: orderIdStr,
            totalAmount: totalPrice,
            itemsCount: orderItems.length,
          },
          // Pass string; NotificationService converts to ObjectId
          relatedId: orderIdStr,
          relatedModel: 'Order',
        });
      } catch (notificationError) {
        this.logger.error(
          'Failed to send customer order notification:',
          notificationError,
        );
      }

      return populatedOrder;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to create order: ${error.message}`,
        (error as any)?.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create order: ${error.message}`,
      );
    } finally {
      session.endSession();
    }
  }

  // ==================== CREATE ORDER FROM CART ====================
  async createOrderFromCart(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDocument> {
    // Get user's cart with selected items
    const cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId), isActive: true })
      .populate('items.product')
      .populate('items.design')
      .exec();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Filter only selected items
    const selectedItems = (cart.items as any[]).filter(
      (item: any) => item.isSelected,
    );
    if (selectedItems.length === 0) {
      throw new BadRequestException('No items selected in cart');
    }

    // Convert cart items to order items
    const orderItems = selectedItems.map((item: any) => ({
      product: item.product._id,
      design: item.design?._id,
      variantQuantities: item.variantQuantities.map((vq: any) => ({
        variant: vq.variant,
        sizeQuantities: vq.sizeQuantities.map((sq: any) => ({
          size: sq.size,
          quantity: sq.quantity,
          price: item.price,
        })),
      })),
      price: item.price,
      designData: item.designData,
      isDesignItem: item.isDesignItem,
      discount: 0, // Apply your discount logic here if needed
    }));

    const createOrderDtoWithItems: CreateOrderDto = {
      ...createOrderDto,
      items: orderItems as any,
    };

    return this.createOrder(userId, createOrderDtoWithItems);
  }

  // ==================== GET ORDERS ====================
  async getOrders(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ user: new Types.ObjectId(userId), isActive: true })
        .populate('shippingAddress')
        .populate('items.product', 'productName brand thumbnail')
        .populate('items.design', 'designName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({
        user: new Types.ObjectId(userId),
        isActive: true,
      }),
    ]);

    return {
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        ordersPerPage: limit,
      },
    };
  }

  // ==================== GET ORDER BY ID ====================
  async getOrderById(userId: string, orderId: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .populate('user', 'firstName lastName email phone')
      .populate('shippingAddress')
      .populate(
        'items.product',
        'productName brand thumbnail price discountedPrice variants',
      )
      .populate(
        'items.design',
        'designName frontImage backImage leftImage rightImage',
      )
      .populate({
        path: 'items.variantQuantities.variant',
        populate: { path: 'color', select: 'name hexValue' },
      })
      .populate('items.variantQuantities.sizeQuantities.size', 'name')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ==================== UPDATE ORDER STATUS ====================
  async updateOrderStatus(
    userId: string,
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const oldStatus = order.status;
    order.status = updateOrderStatusDto.status;

    // Update deliveredAt if status is delivered
    if (updateOrderStatusDto.status === OrderStatus.DELIVERED) {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save();

    // 🔔 NOTIFICATION: Notify customer about order status update
    try {
      await this.notificationService.createNotification({
        recipient: userId,
        title: `Order Status Updated`,
        message: `Your order #${orderId} status has been updated from ${oldStatus} to ${updateOrderStatusDto.status}.`,
        type: NotificationType.ORDER_UPDATED,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          orderId: orderId,
          oldStatus: oldStatus,
          newStatus: updateOrderStatusDto.status,
        },
        relatedId: new Types.ObjectId(orderId),
        relatedModel: 'Order',
      });
    } catch (notificationError) {
      this.logger.error(
        'Failed to send order status update notification:',
        notificationError,
      );
    }

    return updatedOrder;
  }

  // ==================== UPDATE PAYMENT STATUS ====================
  async updatePaymentStatus(
    userId: string,
    orderId: string,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const oldPaymentStatus = order.paymentStatus;
    order.paymentStatus = updatePaymentStatusDto.paymentStatus;
    order.paymentResult = updatePaymentStatusDto.paymentResult;

    // Update paidAt if payment is successful
    if (updatePaymentStatusDto.paymentStatus === PaymentStatus.PAID) {
      order.isPaid = true;
      order.paidAt = new Date();

      // 🔔 NOTIFICATION: Notify admins about successful payment
      try {
        const adminUsers = await this.getAdminUsers();
        const adminIds = adminUsers.map((admin) =>
          (admin as any)?._id?.toString(),
        );

        await this.notificationService.notifyPaymentReceived({
          orderId: orderId,
          customerId: userId,
          amount: order.totalPrice,
          adminIds: adminIds.filter(Boolean) as string[],
        });
      } catch (notificationError) {
        this.logger.error(
          'Failed to send payment notification:',
          notificationError,
        );
      }

      // 🔔 NOTIFICATION: Notify customer about successful payment
      try {
        await this.notificationService.createNotification({
          recipient: userId,
          title: 'Payment Successful',
          message: `Your payment of $${order.totalPrice} for order #${orderId} has been processed successfully.`,
          type: NotificationType.PAYMENT_RECEIVED,
          priority: NotificationPriority.HIGH,
          metadata: {
            orderId: orderId,
            amount: order.totalPrice,
            paymentMethod: order.paymentMethod,
          },
          relatedId: new Types.ObjectId(orderId),
          relatedModel: 'Order',
        });
      } catch (notificationError) {
        this.logger.error(
          'Failed to send customer payment notification:',
          notificationError,
        );
      }
    }

    // 🔔 NOTIFICATION: Notify about payment status change
    try {
      await this.notificationService.createNotification({
        recipient: userId,
        title: 'Payment Status Updated',
        message: `Payment status for order #${orderId} has been updated from ${oldPaymentStatus} to ${updatePaymentStatusDto.paymentStatus}.`,
        type: NotificationType.ORDER_UPDATED,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          orderId: orderId,
          oldPaymentStatus: oldPaymentStatus,
          newPaymentStatus: updatePaymentStatusDto.paymentStatus,
        },
        relatedId: new Types.ObjectId(orderId),
        relatedModel: 'Order',
      });
    } catch (notificationError) {
      this.logger.error(
        'Failed to send payment status update notification:',
        notificationError,
      );
    }

    return await order.save();
  }

  // ==================== CANCEL ORDER ====================
  async cancelOrder(userId: string, orderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only allow cancellation for pending or confirmed orders
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status: ${order.status}`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.paymentStatus = PaymentStatus.REFUNDED;

    const cancelledOrder = await order.save();

    // 🔔 NOTIFICATION: Notify admins about order cancellation
    try {
      const adminUsers = await this.getAdminUsers();
      const adminIds = adminUsers.map((admin) =>
        (admin as any)?._id?.toString(),
      );

      for (const adminId of adminIds.filter(Boolean) as string[]) {
        await this.notificationService.createNotification({
          recipient: adminId,
          title: 'Order Cancelled',
          message: `Order #${orderId} has been cancelled by the customer.`,
          type: NotificationType.ORDER_CANCELLED,
          priority: NotificationPriority.HIGH,
          metadata: {
            orderId: orderId,
            customerId: userId,
            totalAmount: order.totalPrice,
          },
          relatedId: new Types.ObjectId(orderId),
          relatedModel: 'Order',
        });
      }
    } catch (notificationError) {
      this.logger.error(
        'Failed to send order cancellation notification to admins:',
        notificationError,
      );
    }

    // 🔔 NOTIFICATION: Notify customer about order cancellation
    try {
      await this.notificationService.createNotification({
        recipient: userId,
        title: 'Order Cancelled',
        message: `Your order #${orderId} has been cancelled successfully.`,
        type: NotificationType.ORDER_CANCELLED,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          orderId: orderId,
          refundAmount: order.totalPrice,
        },
        relatedId: new Types.ObjectId(orderId),
        relatedModel: 'Order',
      });
    } catch (notificationError) {
      this.logger.error(
        'Failed to send order cancellation notification to customer:',
        notificationError,
      );
    }

    return cancelledOrder;
  }

  // ==================== ADMIN METHODS ====================
  async getAllOrders(page: number = 1, limit: number = 10, filters: any = {}) {
    const skip = (page - 1) * limit;
    const query: any = { isActive: true };

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .populate('user', 'firstName lastName email')
        .populate('shippingAddress')
        .populate('items.product', 'productName brand')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        ordersPerPage: limit,
      },
    };
  }

  async adminUpdateOrder(
    orderId: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderDocument> {
    const order = await this.orderModel
      .findById(orderId)
      .populate('user', 'firstName lastName email')
      .populate('shippingAddress')
      .populate('items.product', 'productName brand')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const oldStatus = order.status;
    const oldPaymentStatus = order.paymentStatus;

    if (updateOrderDto.status) {
      order.status = updateOrderDto.status;

      // Update timestamps based on status
      if (updateOrderDto.status === OrderStatus.DELIVERED) {
        order.isDelivered = true;
        order.deliveredAt = new Date();
      }
    }

    if (updateOrderDto.paymentStatus) {
      order.paymentStatus = updateOrderDto.paymentStatus;

      if (updateOrderDto.paymentStatus === PaymentStatus.PAID) {
        order.isPaid = true;
        order.paidAt = new Date();
      }
    }

    if (updateOrderDto.trackingNumber) {
      order.trackingNumber = updateOrderDto.trackingNumber;
    }

    if (updateOrderDto.shippingCarrier) {
      order.shippingCarrier = updateOrderDto.shippingCarrier;
    }

    if (updateOrderDto.paymentResult) {
      order.paymentResult = updateOrderDto.paymentResult;
    }

    const updatedOrder = await order.save();

    // 🔔 Type the array to avoid never[]
    const notifications: CreateNotificationDto[] = [];

    try {
      if (updateOrderDto.status && updateOrderDto.status !== oldStatus) {
        notifications.push({
          recipient: (order.user as any)?._id?.toString(),
          title: 'Order Status Updated',
          message: `Your order #${orderId} status has been updated to ${updateOrderDto.status}.`,
          type: NotificationType.ORDER_UPDATED,
          priority: NotificationPriority.MEDIUM,
          metadata: {
            orderId: orderId,
            oldStatus: oldStatus,
            newStatus: updateOrderDto.status,
            updatedBy: 'admin',
          },
          relatedId: new Types.ObjectId(orderId),
          relatedModel: 'Order',
        });
      }

      if (
        updateOrderDto.paymentStatus &&
        updateOrderDto.paymentStatus !== oldPaymentStatus
      ) {
        notifications.push({
          recipient: (order.user as any)?._id?.toString(),
          title: 'Payment Status Updated',
          message: `Payment status for order #${orderId} has been updated to ${updateOrderDto.paymentStatus}.`,
          type: NotificationType.ORDER_UPDATED,
          priority: NotificationPriority.MEDIUM,
          metadata: {
            orderId: orderId,
            oldPaymentStatus: oldPaymentStatus,
            newPaymentStatus: updateOrderDto.paymentStatus,
            updatedBy: 'admin',
          },
          relatedId: new Types.ObjectId(orderId),
          relatedModel: 'Order',
        });
      }

      if (notifications.length > 0) {
        await this.notificationService.createBulkNotifications(notifications);
      }
    } catch (notificationError) {
      this.logger.error(
        'Failed to send admin update notifications:',
        notificationError,
      );
    }

    return updatedOrder;
  }

  async getOrderStats() {
    const stats = await this.orderModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, 1, 0],
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
      }
    );
  }

  // ==================== PRIVATE HELPERS ====================
  private asObjectIdString(val: any, fieldLabel: string): string {
    const maybe =
      typeof val === 'string'
        ? val
        : (val?._id?.toString?.() ?? val?.toString?.());

    if (!maybe || !Types.ObjectId.isValid(maybe)) {
      throw new BadRequestException(`${fieldLabel} is missing or invalid`);
    }
    return maybe;
  }

  private async getAdminUsers() {
    // TODO: Replace with a real implementation (e.g., UsersService call)
    return [];
  }
}
