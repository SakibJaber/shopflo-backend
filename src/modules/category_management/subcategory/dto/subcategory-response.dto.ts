import { CategoryResponseDto } from '../../categories/dto/category-response.dto';

export class SubcategoryResponseDto {
  name: string;
  slug: string;
  imageUrl?: string;
  sortOrder: number;
  isVisible: boolean;
  category: CategoryResponseDto;
  createdAt: Date;
  updatedAt: Date;
}
