import {
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateSubcategoryDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  slug?: string;

  @IsMongoId()
  @IsNotEmpty()
  category: string; // Changed from parentCategoryId to category

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
