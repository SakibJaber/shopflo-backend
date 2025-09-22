import {
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsPhoneNumber,
} from 'class-validator';
import { AddressType } from 'src/common/enum/address_type.enum';

export class CreateAddressDto {
  @IsEnum(AddressType)
  @IsNotEmpty()
  type: AddressType;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
