import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from 'src/modules/products/schema/product.schema';
import { User } from 'src/modules/users/schema/user.schema';
import { Size } from 'src/modules/sizes/schema/size.schema';

export type CartDocument = Cart & Document;
export type CartItemDocument = CartItem & Document;

@Schema()
export class SizeQuantity {
  @Prop({ type: Types.ObjectId, ref: Size.name, required: true })
  size: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  quantity: number;
}

@Schema({ timestamps: true })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  variant: Types.ObjectId;

  @Prop({ type: [SizeQuantity], default: [] })
  sizeQuantities: SizeQuantity[];

  @Prop({ default: false })
  isSelected: boolean;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  color: string;

  @Prop()
  frontImage: string;

  @Prop()
  backImage: string;
}

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];

  @Prop({ default: true })
  isActive: boolean;
}

export const SizeQuantitySchema = SchemaFactory.createForClass(SizeQuantity);
export const CartItemSchema = SchemaFactory.createForClass(CartItem);
export const CartSchema = SchemaFactory.createForClass(Cart);

// Index for better query performance
CartSchema.index({ user: 1, isActive: 1 });
CartSchema.index({ 'items.product': 1 });
CartSchema.index({ 'items.variant': 1 });
