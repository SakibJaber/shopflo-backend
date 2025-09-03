import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuerySizeDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string; // Optional search query for size name

  @IsOptional()
  @IsBooleanString()
  isVisible?: string; // 'true' | 'false'

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'updatedAt' = 'name'; // Default sorting by name

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc'; // Sorting order
}
