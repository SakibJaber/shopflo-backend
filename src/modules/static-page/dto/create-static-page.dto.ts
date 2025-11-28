import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class CreateStaticPageDto {
  @IsEnum(['about', 'terms', 'privacy'])
  type: string; // Page type, must be one of these values

  @IsString()
  @IsNotEmpty()
  title: string; // Title of the page

  @IsString()
  @IsNotEmpty()
  content: string; // Page content in HTML or markdown format
}
