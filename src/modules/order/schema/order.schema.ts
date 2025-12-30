import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { PaymentMethod, PaymentStatus } from 'src/common/enum/payment.enum';

@Schema({ _id: false })
export class OrderSizeQuantity {
  @Prop({ type: Types.ObjectId, ref: 'Size', required: true })
  size: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  sizeTotal: number;
}

@Schema({ _id: false })
export class OrderVariantQuantity {
  @Prop({ type: Types.ObjectId, required: true })
  variant: Types.ObjectId;

  @Prop({ type: [OrderSizeQuantity], default: [] })
  sizeQuantities: OrderSizeQuantity[];

  @Prop({ required: true, min: 0 })
  variantTotal: number;
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Design', required: false })
  design?: Types.ObjectId;

  @Prop({ type: [OrderVariantQuantity], default: [] })
  variantQuantities: OrderVariantQuantity[];

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  itemTotal: number;

  @Prop({ type: Object, default: {} })
  designData?: any;

  @Prop({ default: false })
  isDesignItem: boolean;
}

@Schema({ timestamps: true })
export class Order extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
  address: Types.ObjectId;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ type: Object, default: null })
  coupon?: {
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  };

  @Prop({ default: 0 })
  discountAmount: number;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  idempotencyKey?: string;

  @Prop()
  trackingNumber?: string;

  @Prop({ default: Date.now })
  orderDate: Date;
}

export const OrderSizeQuantitySchema =
  SchemaFactory.createForClass(OrderSizeQuantity);
export const OrderVariantQuantitySchema =
  SchemaFactory.createForClass(OrderVariantQuantity);
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
export const OrderSchema = SchemaFactory.createForClass(Order);
