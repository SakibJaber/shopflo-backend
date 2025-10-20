import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DesignDocument = Design & Document;

@Schema({ timestamps: true })
export class Design {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  designName: string;

  @Prop({ required: false })
  description?: string;

  // Front design (required)
  @Prop({ required: true })
  frontImage: string;

  @Prop({ required: false })
  frontElement?: string;

  // Back design (optional)
  @Prop({ required: false })
  backImage?: string;

  @Prop({ required: false })
  backElement?: string;

  // Left side design (optional)
  @Prop({ required: false })
  leftImage?: string;

  @Prop({ required: false })
  leftElement?: string;

  // Right side design (optional)
  @Prop({ required: false })
  rightImage?: string;

  @Prop({ required: false })
  rightElement?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  baseProduct: Types.ObjectId;

  // @Prop({ type: Types.ObjectId, ref: 'Color', required: true }) // New: Required color reference
  // color: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  designPreferences: {
    colors?: string[];
    printType?: string;
    notes?: string;
  };
}

export const DesignSchema = SchemaFactory.createForClass(Design);
