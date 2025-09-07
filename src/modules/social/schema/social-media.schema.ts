import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SocialMediaPlatform =
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'pinterest'
  | 'tiktok'
  | 'whatsapp'
  | 'telegram';

@Schema({ timestamps: true })
export class SocialMedia extends Document {
  @Prop({
    required: true,
    enum: [
      'facebook',
      'twitter',
      'instagram',
      'linkedin',
      'youtube',
      'pinterest',
      'tiktok',
      'whatsapp',
      'telegram',
    ],
  })
  platform: SocialMediaPlatform;

  @Prop({ required: true })
  url: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number; // For sorting purposes

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const SocialMediaSchema = SchemaFactory.createForClass(SocialMedia);
