import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationType } from 'src/common/enum/notification_type.enum';

export type NotificationDocument = Notification & Document;

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  recipient: Types.ObjectId; // If null, it's a broadcast notification

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  sender: Types.ObjectId; // Who triggered the notification

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: NotificationType, default: NotificationType.CUSTOM })
  type: NotificationType;

  @Prop({ enum: NotificationStatus, default: NotificationStatus.UNREAD })
  status: NotificationStatus;

  @Prop({ enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  priority: NotificationPriority;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // Additional data like orderId, productId, etc.

  @Prop({ type: Types.ObjectId, refPath: 'relatedModel' })
  relatedId: Types.ObjectId; // ID of the related entity (order, product, etc.)

  @Prop({ type: String })
  relatedModel: string; // Model name of the related entity

  @Prop({ default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
  expiresAt: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index for better query performance
NotificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
