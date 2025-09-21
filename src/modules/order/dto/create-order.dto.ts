import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'src/common/enum/payment_method.enum';

export class OrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @IsMongoId()
  @IsNotEmpty()
  variant: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsOptional()
  frontImage?: string;

  @IsString()
  @IsOptional()
  backImage?: string;
}

export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  shippingAddress: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @IsNotEmpty()
  itemsTotal: number;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;
}
