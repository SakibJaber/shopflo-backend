import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FAQ extends Document {
  @Prop({ required: true })
  question: string; // The question text

  @Prop({ required: true })
  answer: string; // The answer text

  @Prop({ default: true })
  isActive: boolean; // Whether the FAQ is active or not
}

export const FAQSchema = SchemaFactory.createForClass(FAQ);
