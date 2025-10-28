import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsEnum,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, OrderStatus, PaymentStatus } from '../schema/order.schema';

export class OrderItemSizeQuantityDto {
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

export class OrderItemVariantDto {
  @IsMongoId()
  @IsNotEmpty()
  variant: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemSizeQuantityDto)
  sizeQuantities: OrderItemSizeQuantityDto[];
}

export class CreateOrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @IsOptional()
  @IsMongoId()
  design?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemVariantDto)
  variantQuantities: OrderItemVariantDto[];

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  designData?: any;

  @IsOptional()
  @IsBoolean()
  isDesignItem?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  shippingAddress: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  shippingCarrier?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  paymentStatus: PaymentStatus;

  @IsOptional()
  paymentResult?: any;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  shippingCarrier?: string;

  @IsOptional()
  paymentResult?: any;
}