import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BusinessInfo extends Document {
  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  State: string;

  @Prop()
  City: string;

  @Prop()
  Country: string;
}

export const BusinessInfoSchema = SchemaFactory.createForClass(BusinessInfo);
