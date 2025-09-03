import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/modules/users/schema/user.schema'; // Assuming you have a user module

export type BlogDocument = Blog & Document;

@Schema({ timestamps: true })
export class Blog {
  @Prop({ required: true, trim: true })
  title: string; // Title of the blog post

  @Prop({ required: true })
  content: string; // Blog content

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  author: Types.ObjectId; // Reference to the user (author) who created the blog post

  @Prop({ type: String })
  imageUrl?: string; // image URL (e.g., blog thumbnail)

  @Prop({ type: Boolean, default: true })
  isVisible: boolean; // Whether the blog post is visible to public
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
