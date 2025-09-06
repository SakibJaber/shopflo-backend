import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BusinessInfo extends Document {
  @Prop({ required: true, default: 'Business Name' })
  businessName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  hours: string;

  @Prop({ required: false })
  mapEmbedUrl?: string;
}

export const BusinessInfoSchema = SchemaFactory.createForClass(BusinessInfo);
