import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema';
import { Product } from 'src/modules/products/schema/product.schema';
import { Design } from 'src/modules/designs/schema/design.schema';

import { Size } from 'src/modules/sizes/schema/size.schema';
import { Color } from 'src/modules/color/schema/color.schema';
import { Address } from 'src/modules/address/schema/address.schema';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  CASH_ON_DELIVERY = 'cash_on_delivery',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

@Schema()
export class OrderItemVariantSizeQuantity {
  @Prop({ type: Types.ObjectId, ref: 'Color', required: true })
  variant: Types.ObjectId;

  @Prop({ type: [{ 
    size: { type: Types.ObjectId, ref: 'Size', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }] })
  sizeQuantities: { size: Types.ObjectId; quantity: number; price: number }[];
}

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Design.name, required: false })
  design?: Types.ObjectId;

  @Prop({ type: [OrderItemVariantSizeQuantity], default: [] })
  variantQuantities: OrderItemVariantSizeQuantity[];

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: Object, default: {} })
  designData?: any;

  @Prop({ default: false })
  isDesignItem: boolean;

  @Prop({ default: 0, min: 0 })
  discount: number;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({ type: Types.ObjectId, ref: Address.name, required: true })
  shippingAddress: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: Object.values(PaymentMethod),
    required: true 
  })
  paymentMethod: PaymentMethod;

  @Prop({ 
    type: String, 
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  @Prop({ 
    type: String, 
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING
  })
  status: OrderStatus;

  @Prop({ type: Object, default: {} })
  paymentResult?: any;

  @Prop({ required: true, min: 0 })
  itemsPrice: number;

  @Prop({ required: true, min: 0 })
  taxPrice: number;

  @Prop({ required: true, min: 0 })
  shippingPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ default: false })
  isDelivered: boolean;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: String })
  trackingNumber?: string;

  @Prop({ type: String })
  shippingCarrier?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const OrderItemVariantSizeQuantitySchema = SchemaFactory.createForClass(OrderItemVariantSizeQuantity);
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
export const OrderSchema = SchemaFactory.createForClass(Order);