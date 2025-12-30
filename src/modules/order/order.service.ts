import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schema/order.schema';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { Address } from 'src/modules/address/schema/address.schema';
import { Cart, CartDocument } from 'src/modules/cart/schema/cart.schema';
import { User } from 'src/modules/users/schema/user.schema';
import { PaymentMethod, PaymentStatus } from 'src/common/enum/payment.enum';
import { v4 as uuidv4 } from 'uuid';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import {
  Product,
  ProductDocument,
} from 'src/modules/products/schema/product.schema';
import {
  Design,
  DesignDocument,
} from 'src/modules/designs/schema/design.schema';
import { NotificationService } from 'src/modules/notifications/notifications.service';
import { ProductStatus } from 'src/common/enum/product.status.enum';
import { CartService } from '../cart/services/cart.service';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Design.name) private readonly designModel: Model<Design>,
    private readonly notificationService: NotificationService,
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Idempotency check
    if (createOrderDto.idempotencyKey) {
      const existingOrder = await this.orderModel.findOne({
        idempotencyKey: createOrderDto.idempotencyKey,
      });
      if (existingOrder) return existingOrder;
    }

    // Validate address
    const address = await this.addressModel.findOne({
      _id: createOrderDto.addressId,
      user: new Types.ObjectId(userId),
    });
    if (!address) throw new BadRequestException('Invalid address');

    const cart = await this.cartService.validateCartForCheckout(userId);

    // Prepare order items and calculate totals
    let subtotal = 0;
    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = item.product as any;

        const itemVariantQuantities = await Promise.all(
          item.variantQuantities.map(async (vq) => {
            const variantSizeQuantities = await Promise.all(
              vq.sizeQuantities.map(async (sq) => {
                const sizeTotal = product.discountedPrice * sq.quantity;
                return {
                  size: sq.size,
                  quantity: sq.quantity,
                  price: product.discountedPrice,
                  sizeTotal,
                };
              }),
            );

            const variantTotal = variantSizeQuantities.reduce(
              (sum, sq) => sum + sq.sizeTotal,
              0,
            );

            return {
              variant: vq.variant,
              sizeQuantities: variantSizeQuantities,
              variantTotal,
            };
          }),
        );

        const itemTotal = itemVariantQuantities.reduce(
          (sum, vq) => sum + vq.variantTotal,
          0,
        );

        subtotal += itemTotal;

        return {
          _id: new Types.ObjectId(),
          product: item.product,
          design: item.design,
          variantQuantities: itemVariantQuantities,
          price: product.discountedPrice,
          itemTotal,
          designData: item.designData,
          isDesignItem: item.isDesignItem,
        };
      }),
    );

    let total = subtotal;
    let couponDetails: any = null;
    let discountAmount = 0;

    // Apply coupon if present in cart
    if (cart.coupon) {
      try {
        const coupon = await this.couponsService.validateCoupon(
          cart.coupon,
          userId,
          subtotal,
          orderItems,
        );

        discountAmount = this.couponsService.calculateDiscount(
          coupon,
          subtotal,
          orderItems,
        );

        total = Math.max(0, subtotal - discountAmount);

        couponDetails = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount,
        };

        // Increment usage count
        await this.couponsService.incrementUsageCount(
          (coupon as any)._id.toString(),
          userId,
        );
      } catch (error) {
        this.logger.warn(
          `Coupon validation failed during order creation: ${error.message}`,
        );
        // Proceed without coupon if validation fails at this stage (or throw error if strict)
        // For now, we'll proceed without discount to avoid blocking order if coupon just expired
      }
    }

    // Validate stock availability (additional safety check)
    // await this.validateStockAvailability(orderItems);

    // Create order
    const order = new this.orderModel({
      user: new Types.ObjectId(userId),
      items: orderItems,
      address: new Types.ObjectId(createOrderDto.addressId),
      paymentMethod: createOrderDto.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      subtotal,
      total,
      coupon: couponDetails,
      discountAmount,
      status: OrderStatus.PENDING,
      idempotencyKey: createOrderDto.idempotencyKey || uuidv4(),
      orderDate: new Date(),
    });

    const savedOrder = await order.save();

    // Update product stock
    // await this.updateProductStock(orderItems, 'decrement');

    // Remove ordered items from cart
    await this.removeOrderedItemsFromCart(userId, cart.items);

    // Send notifications
    await this.notifyOrderCreation(savedOrder, userId);

    return savedOrder;
  }

  private async updateProductStock(
    orderItems: any[],
    operation: 'decrement' | 'increment',
  ) {
    for (const item of orderItems) {
      const product = await this.productModel.findById(item.product);
      if (!product) continue;

      // Only attempt to change numeric stock if the product has a numeric 'stock' field.
      const prodAny = product as any;
      if (typeof prodAny.stock !== 'number') {
        // No numeric stock on this product; skip and log for visibility.
        this.logger.debug(
          `Skipping stock ${operation} for product ${product._id} because numeric 'stock' is not present on schema.`,
        );
        continue;
      }

      let totalQuantity = 0;
      for (const vq of item.variantQuantities) {
        for (const sq of vq.sizeQuantities) {
          totalQuantity += sq.quantity;
        }
      }

      const update =
        operation === 'decrement'
          ? { $inc: { stock: -totalQuantity } }
          : { $inc: { stock: totalQuantity } };

      await this.productModel.findByIdAndUpdate(item.product, update).exec();
    }
  }

  private async removeOrderedItemsFromCart(
    userId: string,
    orderedItems: any[],
  ) {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!cart) return;

    // Remove ordered items from cart
    cart.items = cart.items.filter(
      (cartItem) =>
        !orderedItems.some(
          (orderedItem) =>
            orderedItem._id.toString() === cartItem._id.toString(),
        ),
    );

    await cart.save();
  }

  private async notifyOrderCreation(order: Order, userId: string) {
    // Notify user
    await this.notificationService.createNotification({
      title: 'Order Placed',
      message: `Your order #${order._id} has been placed successfully`,
      recipient: userId,
      metadata: { orderId: order._id, status: OrderStatus.PENDING },
    });

    // Notify admins
    const admins = await this.userModel.find({ role: 'admin' }).exec();
    await Promise.all(
      admins.map((admin) =>
        this.notificationService.createNotification({
          title: 'New Order Placed',
          message: `Order #${order._id} placed by user ${userId}`,
          recipient: admin._id.toString(),
          metadata: { orderId: order._id, userId },
        }),
      ),
    );
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: OrderStatus,
    userId?: string,
  ) {
    const query: any = {};
    if (status) query.status = status;
    if (userId) query.user = new Types.ObjectId(userId);

    if (search && search.trim() !== '') {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isObjectId = Types.ObjectId.isValid(search);
      const idMatch = isObjectId ? [{ _id: new Types.ObjectId(search) }] : [];

      query.$or = [
        ...idMatch,
        { 'user.firstName': { $regex: escaped, $options: 'i' } },
        { 'user.lastName': { $regex: escaped, $options: 'i' } },
        { 'user.email': { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate([
          {
            path: 'user',
            select: 'firstName lastName email imageUrl',
            options: { lean: true },
          },
          {
            path: 'address',
            select:
              'streetNo city state postalCode country type recipientFirstName recipientLastName recipientEmail',
            options: { lean: true },
          },
          {
            path: 'items.product',
            select:
              'productName brand price discountedPrice thumbnail variants',
            options: { lean: true },
            populate: [
              {
                path: 'brand',
                select: 'brandName brandLogo',
                options: { lean: true },
              },
              {
                path: 'variants.color',
                select: 'name hexValue',
                options: { lean: true },
              },
            ],
          },
          {
            path: 'items.design',
            select:
              'designName frontImage frontElement backImage backElement leftImage leftElement rightImage rightElement',
            options: { lean: true },
          },
          // populate for sizes
          {
            path: 'items.variantQuantities.sizeQuantities.size',
            model: 'Size',
            select: 'name',
            options: { lean: true },
          },
        ])
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate([
        {
          path: 'user',
          select: 'firstName lastName email imageUrl',
          options: { lean: true },
        },
        {
          path: 'address',
          select:
            'streetNo city state postalCode country type recipientFirstName recipientLastName recipientEmail',
          options: { lean: true },
        },
        {
          path: 'items.product',
          select: 'productName brand price discountedPrice thumbnail variants',
          options: { lean: true },
          populate: [
            {
              path: 'brand',
              select: 'brandName brandLogo',
              options: { lean: true },
            },
            // {
            //   path: 'variants.color',
            //   select: 'name hexValue',
            // },
            // {
            //   path: 'variants.size',
            //   select: 'name',
            // },
          ],
        },
        {
          path: 'items.design',
          select:
            'designName frontImage frontElement backImage backElement leftImage leftElement rightImage rightElement',
          options: { lean: true },
        },
        // populate for sizes
        {
          path: 'items.variantQuantities.sizeQuantities.size',
          model: 'Size',
          select: 'name',
          options: { lean: true },
        },
      ])
      .exec();

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status: updateOrderStatusDto.status,
          trackingNumber: updateOrderStatusDto.trackingNumber,
        },
        { new: true },
      )
      .populate('user', 'firstName lastName');

    if (!order) throw new NotFoundException('Order not found');

    const userIdStr =
      (order.user as any)?._id?.toString?.() ?? order.user.toString();

    // Notify user of status update
    await this.notificationService.createNotification({
      title: 'Order Status Updated',
      message: `Your order #${order._id} is now "${updateOrderStatusDto.status}"`,
      relatedId: userIdStr,
      metadata: {
        orderId: order._id,
        newStatus: updateOrderStatusDto.status,
        trackingNumber: updateOrderStatusDto.trackingNumber,
      },
    });

    return order;
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    stripePaymentIntentId?: string,
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    order.paymentStatus = paymentStatus;
    if (stripePaymentIntentId) {
      order.stripePaymentIntentId = stripePaymentIntentId;
    }

    // Update order status based on payment status
    if (paymentStatus === PaymentStatus.SUCCEEDED) {
      order.status = OrderStatus.CONFIRMED;
    } else if (paymentStatus === PaymentStatus.FAILED) {
      order.status = OrderStatus.CANCELLED;
      // Restore product stock
      await this.updateProductStock(order.items, 'increment');
    }

    await order.save();

    // Notify user
    await this.notificationService.createNotification({
      title: 'Payment Status Update',
      message: `Payment for order #${order._id} is ${paymentStatus}`,
      recipient: order.user.toString(),
      metadata: { orderId: order._id, paymentStatus },
    });

    return order;
  }

  async getOrdersByUser(userId: string, page = 1, limit = 10) {
    return this.findAll(page, limit, undefined, undefined, userId);
  }

  async getOrderSummary(userId: string) {
    const orders = await this.orderModel.find({
      user: new Types.ObjectId(userId),
    });

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(
      (order) => order.status === OrderStatus.PENDING,
    ).length;
    const deliveredOrders = orders.filter(
      (order) => order.status === OrderStatus.DELIVERED,
    ).length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalSpent,
    };
  }
}
