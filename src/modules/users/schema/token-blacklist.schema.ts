import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TokenBlacklist {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export type TokenBlacklistDocument = TokenBlacklist & Document;
export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// Automatically delete expired tokens
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
