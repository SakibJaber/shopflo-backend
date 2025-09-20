import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ColorDocument = Color & Document;

@Schema({ timestamps: true })
export class Color {
  @Prop({ required: true, trim: true })
  name: string; // Name of the color (e.g., "Red")

  @Prop({ required: true })
  hexValue: string; // The hex value of the color (e.g., "#2cd103ff")
}

export const ColorSchema = SchemaFactory.createForClass(Color);
