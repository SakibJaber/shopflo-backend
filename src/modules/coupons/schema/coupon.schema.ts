import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: DiscountType })
  discountType: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ min: 0 })
  usageLimit?: number;

  @Prop({ default: 0, min: 0 })
  usedCount: number;

  @Prop({ default: 1, min: 1 })
  userUsageLimit: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  usedBy: Types.ObjectId[];

  @Prop({ required: true })
  image: string;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category?: Types.ObjectId;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
