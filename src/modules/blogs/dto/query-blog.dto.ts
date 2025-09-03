import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryBlogDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by title or tags

  @IsOptional()
  @IsBooleanString()
  isVisible?: string; // 'true' | 'false'

  @IsOptional()
  @IsString()
  sortBy?: 'title' | 'createdAt' | 'updatedAt' = 'createdAt'; // Default sort by creation date

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc'; // Sorting order
}
