import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SizeQuantityDto {
  @IsMongoId()
  @IsNotEmpty()
  size: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class VariantQuantityDto {
  @IsMongoId()
  @IsNotEmpty()
  variant: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeQuantityDto)
  sizeQuantities: SizeQuantityDto[];
}

export class AddRegularProductToCartDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantQuantityDto)
  variantQuantities: VariantQuantityDto[];

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}

export class AddDesignToCartDto {
  @IsMongoId()
  @IsNotEmpty()
  design: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantQuantityDto)
  variantQuantities: VariantQuantityDto[];

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}

export class RemoveFromCartDto {
  @IsMongoId()
  @IsNotEmpty()
  cartItemId: string;
}
