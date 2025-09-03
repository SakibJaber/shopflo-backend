import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SizeDocument = Size & Document;

@Schema({ timestamps: true })
export class Size {
  @Prop({ required: true, trim: true })
  name: string; // Name of the size (e.g., "Small", "Medium", "Large")

  @Prop({ required: true })
  value: string; // The actual size value (e.g., "S", "M", "L", "XL")

  @Prop({ type: Boolean, default: true })
  isVisible: boolean; // Flag to control whether the size is active/visible
}

export const SizeSchema = SchemaFactory.createForClass(Size);
