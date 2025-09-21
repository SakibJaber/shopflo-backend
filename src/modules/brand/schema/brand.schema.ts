import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandDocument = Brand & Document;

@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true, unique: true, trim: true })
  brandName: string;

  @Prop({ required: true })
  brandLogo: string;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
