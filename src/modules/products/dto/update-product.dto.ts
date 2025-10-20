import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ProductVariantDto } from 'src/modules/products/dto/product-variant.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsMongoId()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsMongoId()
  @IsNotEmpty()
  subcategory?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shortDescription?: string;

  @IsMongoId()
  @IsNotEmpty()
  brand: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  discountedPrice: number;

  @IsOptional()
  @IsString()
  thumbnail?: string; // New optional field

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  variants?: ProductVariantDto[];
}
