import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateCartDto {
  @IsMongoId()
  user: string; // User ID for the cart
}

export class AddToCartDto {
  @IsMongoId()
  product: string; // Product ID

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean; // Whether the item is selected for checkout
}

export class UpdateCartItemDto {
  @IsOptional()
  @IsNumber()
  quantity?: number; // Quantity to be updated

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean; // Whether to select for checkout
}

export class RemoveFromCartDto {
  @IsMongoId()
  product: string; // Product ID to be removed
}
