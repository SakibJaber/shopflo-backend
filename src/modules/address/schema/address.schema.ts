import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AddressType } from 'src/common/enum/address_type.enum';
import { User } from 'src/modules/users/schema/user.schema';

export type AddressDocument = Address & Document;


@Schema({ timestamps: true })
export class Address {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: AddressType, default: AddressType.HOME })
  type: AddressType;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  zipCode: string;

  @Prop({ required: true })
  country: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
