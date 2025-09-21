import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateProductDto {
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @IsMongoId()
  @IsNotEmpty()
  subcategory: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsMongoId()
  @IsNotEmpty()
  brand: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  // No variants here
}
