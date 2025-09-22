import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SizeDocument = Size & Document;

@Schema({ timestamps: true })
export class Size {
  @Prop({ required: true, trim: true })
  name: string; // Name of the size (e.g., "S", "M", "L")
}

export const SizeSchema = SchemaFactory.createForClass(Size);
