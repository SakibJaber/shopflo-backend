import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [String] })
  colors: string[];

  @Prop({ required: true })
  price: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ type: [String] })
  imageUrl: string[]; // Array to store multiple image URLs

  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: Number, default: 0 })
  averageRating: number;

  @Prop({ type: [String], required: true })
  sizes: string[];

  @Prop({ type: [String], required: true })
  availableColors: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
