import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema';
import { Address } from 'src/modules/address/schema/address.schema';
import { Product } from 'src/modules/products/schema/product.schema';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { PaymentMethod } from 'src/common/enum/payment_method.enum';
import { PaymentStatus } from 'src/common/enum/payment_status.enum';

export type OrderDocument = Order & Document;
export type OrderItemDocument = OrderItem & Document;

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  variant: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  size: string;

  @Prop()
  frontImage: string;

  @Prop()
  backImage: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Address.name, required: true })
  shippingAddress: Types.ObjectId;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({ required: true })
  itemsTotal: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop()
  stripePaymentIntentId: string;

  @Prop()
  trackingNumber: string;

  @Prop()
  estimatedDelivery: Date;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
export const OrderSchema = SchemaFactory.createForClass(Order);
