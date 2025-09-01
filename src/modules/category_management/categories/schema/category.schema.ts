import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  slug: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder?: number;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Text index on existing fields to enable search
CategorySchema.index({ name: 'text', slug: 'text' }, { name: 'CategoryTextIndex' });
