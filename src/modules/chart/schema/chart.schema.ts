import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChartDocument = Chart & Document;

@Schema({ timestamps: true })
export class Chart {
  @Prop({ required: true })
  chartImage: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const ChartSchema = SchemaFactory.createForClass(Chart);