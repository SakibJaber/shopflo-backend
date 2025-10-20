import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from 'src/modules/products/schema/product.schema';
import { User } from 'src/modules/users/schema/user.schema';
import { Size } from 'src/modules/sizes/schema/size.schema';
import { Design } from 'src/modules/designs/schema/design.schema';
import { Color } from 'src/modules/color/schema/color.schema';

export type CartDocument = Cart & Document;

@Schema()
export class VariantSizeQuantity {
  @Prop({ type: Types.ObjectId, ref: 'Color', required: true })
  variant: Types.ObjectId; // This is the variant ID (color variant)

  @Prop({ type: [{ 
    size: { type: Types.ObjectId, ref: 'Size', required: true },
    quantity: { type: Number, required: true, min: 0 }
  }], default: [] })
  sizeQuantities: { size: Types.ObjectId; quantity: number }[];
}

@Schema({ timestamps: true })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Design.name, required: false })
  design?: Types.ObjectId;

  @Prop({ type: [VariantSizeQuantity], default: [] })
  variantQuantities: VariantSizeQuantity[];

  @Prop({ default: false })
  isSelected: boolean;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Object, default: {} })
  designData?: any;

  @Prop({ default: false })
  isDesignItem: boolean;
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

export const VariantSizeQuantitySchema = SchemaFactory.createForClass(VariantSizeQuantity);
export const CartItemSchema = SchemaFactory.createForClass(CartItem);
export const CartSchema = SchemaFactory.createForClass(Cart);