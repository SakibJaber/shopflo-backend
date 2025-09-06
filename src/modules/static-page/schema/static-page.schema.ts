import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class StaticPage extends Document {
  @Prop({ required: true, enum: ['about-us', 'terms', 'privacy-policy'] })
  type: string; // Define the type of the page

  @Prop({ required: true })
  content: string; // Page content in HTML or markdown format

  @Prop({ required: true })
  title: string; // Page title
}

export const StaticPageSchema = SchemaFactory.createForClass(StaticPage);
