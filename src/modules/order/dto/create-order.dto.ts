import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'src/common/enum/payment_method.enum';
import { OrderStatus } from 'src/common/enum/order_status.enum';
import { PaymentStatus } from 'src/common/enum/payment_status.enum';

/**
 * These DTOs are still here for backwards compatibility (admin reads, etc).
 * For order creation we now derive items/totals from the cart on the server.
 */

export class SizeQuantityDto {
  @IsMongoId()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsNotEmpty()
  sizeName: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class OrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @IsOptional()
  @IsMongoId()
  design?: string;

  @IsMongoId()
  @IsNotEmpty()
  variant: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeQuantityDto)
  sizeQuantities: SizeQuantityDto[];

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  frontImage: string;

  @IsString()
  @IsOptional()
  backImage?: string;

  @IsString()
  @IsOptional()
  leftImage?: string;

  @IsString()
  @IsOptional()
  rightImage?: string;

  @IsObject()
  @IsOptional()
  designData?: {
    designName?: string;
    frontImage?: string;
    backImage?: string;
    leftImage?: string;
    rightImage?: string;
    frontElement?: string;
    backElement?: string;
    leftElement?: string;
    rightElement?: string;
  };

  @IsObject()
  @IsOptional()
  productSnapshot?: {
    productName: string;
    brand: string;
    price: number;
    discountedPrice: number;
    thumbnail: string;
  };

  @IsBoolean()
  @IsOptional()
  hasDesign?: boolean;
}

/**
 * For creation, clients now only send shippingAddress + paymentMethod.
 * The rest is computed from the cart.
 * We keep old fields as OPTIONAL so older clients won't break,
 * but the service ignores them and computes authoritative totals server-side.
 */
export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  shippingAddress: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  /** If true (default), order only selected cart items; otherwise order all cart items. */
  @IsOptional()
  @IsBoolean()
  orderSelectedOnly?: boolean;

  // Deprecated/ignored on creation; kept optional for backwards compatibility
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  itemsTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  estimatedDelivery?: string;
}
