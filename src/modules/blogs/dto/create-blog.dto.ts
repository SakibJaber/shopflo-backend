import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string; // Title of the blog post

  @IsString()
  content: string; // Content of the blog post

  @IsString()
  @MinLength(24)
  author: string; // Author (user ID) of the blog post

  @IsOptional()
  @IsString()
  imageUrl?: string; // Optional image URL

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean; // Whether the blog is visible (default: true)
}
