export class CategoryResponseDto {
  name: string;
  slug: string;
  imageUrl?: string;
  sortOrder: number;
  isVisible: boolean;
  subcategories: string[];
  createdAt: Date;
  updatedAt: Date;
}
