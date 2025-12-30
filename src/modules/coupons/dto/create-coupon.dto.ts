import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { DiscountType } from '../schema/coupon.schema';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  usageLimit?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  userUsageLimit?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
