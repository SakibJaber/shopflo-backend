import {
  IsMongoId,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  Min,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'src/common/enum/payment_method.enum';

export class SizeQuantityOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  size: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class VariantQuantityOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  variant: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeQuantityOrderDto)
  sizeQuantities: SizeQuantityOrderDto[];

  @IsNumber()
  @Min(0)
  variantTotal: number;
}

export class OrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @IsMongoId()
  @IsOptional()
  design?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantQuantityOrderDto)
  variantQuantities: VariantQuantityOrderDto[];

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  itemTotal: number;

  @IsBoolean()
  isDesignItem: boolean;

  @IsOptional()
  designData?: any;
}

export class CreateOrderDto {
  @IsMongoId()
  addressId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
