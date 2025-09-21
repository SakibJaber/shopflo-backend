import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @IsMongoId()
  @IsNotEmpty()
  variant: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsNumber()
  @Min(0)
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

export class CreateCartDto {
  @IsMongoId()
  user: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

export class AddToCartDto {
  @IsMongoId()
  product: string;

  @IsMongoId()
  variant: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}

export class UpdateCartItemDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}

export class RemoveFromCartDto {
  @IsMongoId()
  product: string;

  @IsMongoId()
  variant: string;
}
