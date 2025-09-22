import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SizeQuantityDto {
  @IsMongoId()
  size: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class AddToCartDto {
  @IsMongoId()
  product: string;

  @IsMongoId()
  variant: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeQuantityDto)
  sizeQuantities: SizeQuantityDto[];

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}

export class UpdateCartItemDto {
  @IsOptional()
  @IsMongoId()
  size?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeQuantityDto)
  sizeQuantities?: SizeQuantityDto[];

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}

export class RemoveFromCartDto {
  @IsMongoId()
  product: string;

  @IsMongoId()
  variant: string;

  @IsOptional()
  @IsMongoId()
  size?: string;
}
