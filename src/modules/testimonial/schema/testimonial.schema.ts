import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Testimonial extends Document {
  @Prop({ required: true })
  authorName: string;

  @Prop({ required: false })
  designation: string; // e.g., "UX & UI Designer", "Front End Developer"

  @Prop({ required: true })
  comment: string;

  @Prop({ type: String, required: false })
  imageUrl: string; // Author avatar image

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 5, min: 1, max: 5 })
  rating: number;
}

export const TestimonialSchema = SchemaFactory.createForClass(Testimonial);
