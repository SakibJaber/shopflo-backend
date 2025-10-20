import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductStatus } from 'src/common/enum/product.status.enum';
import { VisibilityStatus } from 'src/common/enum/visibility-status.enum';

export type ProductVariantDocument = ProductVariant;

@Schema({ timestamps: true })
export class ProductVariant extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Color', required: true })
  color: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Size' }], required: true })
  size: Types.ObjectId[];

  @Prop({ required: true, enum: VisibilityStatus })
  status: VisibilityStatus;

  @Prop({ required: true, enum: ProductStatus })
  stockStatus: ProductStatus;

  @Prop({ required: true })
  frontImage: string;

  @Prop({ required: true })
  backImage: string;

  @Prop({ required: false }) // New optional field
  leftImage?: string;

  @Prop({ required: false }) // New optional field
  rightImage?: string;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subcategory', required: true })
  subcategory: Types.ObjectId;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  shortDescription: string;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brand: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, max: 100 })
  discountPercentage: number;

  @Prop({ required: true, min: 0 })
  discountedPrice: number;

  @Prop({ required: true }) // New required field
  thumbnail: string;

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ default: 0 })
  salesCount: number;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.pre('save', function (next) {
  if (this.isModified('price') || this.isModified('discountPercentage')) {
    this.discountedPrice =
      this.price - this.price * (this.discountPercentage / 100);
  }
  next();
});
