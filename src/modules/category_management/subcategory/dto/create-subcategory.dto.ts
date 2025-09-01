import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreateSubcategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsMongoId()
  parentCategoryId: string; // Must be a valid category ID

  @IsOptional()
  @IsString()
  imageUrl?: string; // Optional image URL

  @IsOptional()
  sortOrder?: number; // Optional sorting field

  @IsOptional()
  isVisible?: boolean; // Whether the subcategory is visible
}
