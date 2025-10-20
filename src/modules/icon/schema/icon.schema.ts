import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IconDocument = Icon & Document;

@Schema({ timestamps: true })
export class Icon {
  @Prop({ required: true, trim: true, unique: true })
  iconName: string; // e.g., "Home"

  @Prop()
  iconUrl?: string; // uploaded icon file URL (optional)
}

export const IconSchema = SchemaFactory.createForClass(Icon);
