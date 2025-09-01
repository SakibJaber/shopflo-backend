import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from '../../categories/schema/category.schema';

@Schema({ timestamps: true })
export class Subcategory extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  parentCategoryId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  sortOrder?: number; // Optional field for order

  @Prop({ type: String })
  imageUrl?: string; // Optional field for image

  @Prop({ default: true })
  isVisible: boolean;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);
