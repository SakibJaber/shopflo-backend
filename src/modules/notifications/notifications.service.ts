import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationStatus,
  NotificationPriority,
} from './schema/notification.schema';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryDto,
} from './dto/create-notification.dto';
import { NotificationType } from 'src/common/enum/notification_type.enum';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // ==================== CREATE NOTIFICATION ====================
  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    try {
      // Convert string IDs to ObjectId if needed
      const notificationData = this.prepareNotificationData(
        createNotificationDto,
      );
      const notification = new this.notificationModel(notificationData);
      return await notification.save();
    } catch (error) {
      this.logger.error(
        `Failed to create notification: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create notification');
    }
  }

  // ==================== BULK CREATE NOTIFICATIONS ====================
  async createBulkNotifications(
    notificationsData: CreateNotificationDto[],
  ): Promise<NotificationDocument[]> {
    try {
      // Convert all notification data
      const preparedData = notificationsData.map((data) =>
        this.prepareNotificationData(data),
      );
      return await this.notificationModel.create(preparedData);
    } catch (error) {
      this.logger.error(
        `Failed to create bulk notifications: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create bulk notifications');
    }
  }

  // ==================== HELPER: PREPARE NOTIFICATION DATA ====================
  private prepareNotificationData(dto: CreateNotificationDto): any {
    const data: any = { ...dto };

    // Convert string IDs to ObjectId
    if (dto.recipient && typeof dto.recipient === 'string') {
      data.recipient = new Types.ObjectId(dto.recipient);
    }
    if (dto.sender && typeof dto.sender === 'string') {
      data.sender = new Types.ObjectId(dto.sender);
    }
    if (dto.relatedId && typeof dto.relatedId === 'string') {
      data.relatedId = new Types.ObjectId(dto.relatedId);
    }

    return data;
  }

  // ==================== GET NOTIFICATIONS ====================
  async getNotifications(queryDto: NotificationQueryDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (queryDto.recipient) {
      filter.recipient = new Types.ObjectId(queryDto.recipient);
    }
    if (queryDto.type) {
      filter.type = queryDto.type;
    }
    if (queryDto.status) {
      filter.status = queryDto.status;
    }
    if (queryDto.priority) {
      filter.priority = queryDto.priority;
    }
    if (queryDto.isActive !== undefined) {
      filter.isActive = queryDto.isActive;
    }
    if (queryDto.startDate || queryDto.endDate) {
      filter.createdAt = {};
      if (queryDto.startDate) filter.createdAt.$gte = queryDto.startDate;
      if (queryDto.endDate) filter.createdAt.$lte = queryDto.endDate;
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .populate('recipient', 'name email')
        .populate('sender', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== GET USER NOTIFICATIONS ====================
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const filter = {
      $or: [
        { recipient: new Types.ObjectId(userId) },
        { recipient: null }, // Broadcast notifications
      ],
      isActive: true,
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .populate('sender', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        ...filter,
        status: NotificationStatus.UNREAD,
      }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  // ==================== GET NOTIFICATION BY ID ====================
  async getNotificationById(id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findById(id)
      .populate('recipient', 'name email')
      .populate('sender', 'name email')
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  // ==================== UPDATE NOTIFICATION ====================
  async updateNotification(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findByIdAndUpdate(
      id,
      { $set: updateNotificationDto },
      { new: true, runValidators: true },
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  // ==================== MARK AS READ ====================
  async markAsRead(id: string): Promise<NotificationDocument> {
    return this.updateNotification(id, { status: NotificationStatus.READ });
  }

  // ==================== MARK ALL AS READ ====================
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      {
        recipient: new Types.ObjectId(userId),
        status: NotificationStatus.UNREAD,
      },
      { $set: { status: NotificationStatus.READ } },
    );

    return { modifiedCount: result.modifiedCount };
  }

  // ==================== DELETE NOTIFICATION ====================
  async deleteNotification(id: string): Promise<void> {
    const result = await this.notificationModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Notification not found');
    }
  }

  // ==================== ARCHIVE NOTIFICATION ====================
  async archiveNotification(id: string): Promise<NotificationDocument> {
    return this.updateNotification(id, { status: NotificationStatus.ARCHIVED });
  }

  // ==================== GET UNREAD COUNT ====================
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      $or: [{ recipient: new Types.ObjectId(userId) }, { recipient: null }],
      status: NotificationStatus.UNREAD,
      isActive: true,
    });
  }

  // ==================== HELPER METHODS FOR SPECIFIC NOTIFICATION TYPES ====================

  async notifyOrderCreated(orderData: {
    orderId: string;
    customerId: string;
    customerName: string;
    totalAmount: number;
    adminIds: string[]; // Array of admin user IDs
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notification for admins
    for (const adminId of orderData.adminIds) {
      notifications.push({
        recipient: adminId,
        title: 'New Order Received',
        message: `New order #${orderData.orderId} from ${orderData.customerName} for $${orderData.totalAmount}`,
        type: NotificationType.ORDER_CREATED,
        priority: NotificationPriority.HIGH,
        metadata: {
          orderId: orderData.orderId,
          customerName: orderData.customerName,
          totalAmount: orderData.totalAmount,
        },
        relatedId: orderData.orderId, // Just pass the string, it will be converted to ObjectId
        relatedModel: 'Order',
      });
    }

    // Notification for customer
    notifications.push({
      recipient: orderData.customerId,
      title: 'Order Confirmed',
      message: `Your order #${orderData.orderId} has been received and is being processed.`,
      type: NotificationType.ORDER_CREATED,
      priority: NotificationPriority.MEDIUM,
      metadata: {
        orderId: orderData.orderId,
        totalAmount: orderData.totalAmount,
      },
      relatedId: orderData.orderId, // Just pass the string
      relatedModel: 'Order',
    });

    return this.createBulkNotifications(notifications);
  }

  async notifyPaymentReceived(paymentData: {
    orderId: string;
    customerId: string;
    amount: number;
    adminIds: string[];
  }) {
    const notifications: CreateNotificationDto[] = [];

    // Notification for admins
    for (const adminId of paymentData.adminIds) {
      notifications.push({
        recipient: adminId,
        title: 'Payment Received',
        message: `Payment of $${paymentData.amount} received for order #${paymentData.orderId}`,
        type: NotificationType.PAYMENT_RECEIVED,
        priority: NotificationPriority.HIGH,
        metadata: {
          orderId: paymentData.orderId,
          amount: paymentData.amount,
        },
        relatedId: paymentData.orderId,
        relatedModel: 'Order',
      });
    }

    // Notification for customer
    notifications.push({
      recipient: paymentData.customerId,
      title: 'Payment Successful',
      message: `Your payment of $${paymentData.amount} for order #${paymentData.orderId} has been received.`,
      type: NotificationType.PAYMENT_RECEIVED,
      priority: NotificationPriority.MEDIUM,
      metadata: {
        orderId: paymentData.orderId,
        amount: paymentData.amount,
      },
      relatedId: paymentData.orderId,
      relatedModel: 'Order',
    });

    return this.createBulkNotifications(notifications);
  }

  async notifyLowStock(productData: {
    productId: string;
    productName: string;
    currentStock: number;
    adminIds: string[];
  }) {
    const notifications: CreateNotificationDto[] = productData.adminIds.map(
      (adminId) => ({
        recipient: adminId,
        title: 'Low Stock Alert',
        message: `Product "${productData.productName}" is running low on stock. Current stock: ${productData.currentStock}`,
        type: NotificationType.LOW_STOCK,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          productId: productData.productId,
          productName: productData.productName,
          currentStock: productData.currentStock,
        },
        relatedId: productData.productId,
        relatedModel: 'Product',
      }),
    );

    return this.createBulkNotifications(notifications);
  }

  async notifyNewUser(userData: {
    userId: string;
    userName: string;
    email: string;
    adminIds: string[];
  }) {
    const notifications: CreateNotificationDto[] = userData.adminIds.map(
      (adminId) => ({
        recipient: adminId,
        title: 'New User Registration',
        message: `New user registered: ${userData.userName} (${userData.email})`,
        type: NotificationType.NEW_USER,
        priority: NotificationPriority.LOW,
        metadata: {
          userId: userData.userId,
          userName: userData.userName,
          email: userData.email,
        },
        relatedId: userData.userId,
        relatedModel: 'User',
      }),
    );

    return this.createBulkNotifications(notifications);
  }
}
