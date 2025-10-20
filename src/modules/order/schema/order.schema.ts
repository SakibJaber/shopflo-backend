import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema';
import { Address } from 'src/modules/address/schema/address.schema';
import { Product } from 'src/modules/products/schema/product.schema';
import { Design } from 'src/modules/designs/schema/design.schema';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { PaymentMethod } from 'src/common/enum/payment_method.enum';
import { PaymentStatus } from 'src/common/enum/payment_status.enum';

export type OrderDocument = Order & Document;
export type OrderItemDocument = OrderItem & Document;

@Schema()
export class SizeQuantity {
  @Prop({ type: Types.ObjectId, required: true })
  size: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true })
  sizeName: string;
}

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Design.name, required: false })
  design?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  variant: Types.ObjectId;

  @Prop({ type: [SizeQuantity], default: [] })
  sizeQuantities: SizeQuantity[];

  @Prop({ required: true })
  price: number;

  // Store the color name for immutable snapshot readability
  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  frontImage: string;

  @Prop() backImage?: string;
  @Prop() leftImage?: string;
  @Prop() rightImage?: string;

  @Prop({ type: Object, default: {} })
  designData?: {
    designName?: string;
    frontImage?: string;
    backImage?: string;
    leftImage?: string;
    rightImage?: string;
    frontElement?: string;
    backElement?: string;
    leftElement?: string;
    rightElement?: string;
  };

  @Prop({ type: Object, default: {} })
  productSnapshot?: {
    productName: string;
    brand: string;
    price: number;
    discountedPrice: number;
    thumbnail: string;
  };

  @Prop({ default: true })
  hasDesign: boolean;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Address.name, required: true })
  shippingAddress: Types.ObjectId;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  itemsTotal: number;

  @Prop({ required: true, min: 0 })
  shippingFee: number;

  @Prop({ required: true, min: 0 })
  taxAmount: number;

  @Prop({ required: true, min: 0 })
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

  @Prop({ default: 0 })
  itemCount: number;

  @Prop({ default: 0 })
  totalQuantity: number;

  @Prop({ default: 0 })
  designItemCount: number;

  @Prop({ type: Object, default: {} })
  shippingAddressSnapshot: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
}

export const SizeQuantitySchema = SchemaFactory.createForClass(SizeQuantity);
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes for better performance
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ stripePaymentIntentId: 1 }, { unique: true, sparse: true });
OrderSchema.index({ 'items.product': 1 });
OrderSchema.index({ 'items.design': 1 });
OrderSchema.index({ designItemCount: 1 });
