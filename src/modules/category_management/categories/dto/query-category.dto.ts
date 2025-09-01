import { Type } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryCategoryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isVisible?: string; // 'true' | 'false'

  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt', 'updatedAt', 'sortOrder'])
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'sortOrder' = 'sortOrder';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number; // overrides page/limit if provided
}
