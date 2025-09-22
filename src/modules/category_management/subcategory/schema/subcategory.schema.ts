import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from '../../categories/schema/category.schema';

export type SubcategoryDocument = Subcategory & Document;

@Schema({ timestamps: true })
export class Subcategory extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId; 

  @Prop({ type: Number, default: 0 })
  sortOrder?: number;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ required: true, unique: true, index: true, trim: true })
  slug: string;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);

// Text index for search functionality
SubcategorySchema.index(
  { name: 'text', slug: 'text' },
  { name: 'SubcategoryTextIndex' },
);
