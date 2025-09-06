import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaticPageDto {
  @IsEnum(['about-us', 'terms', 'privacy-policy'])
  type: string; // Page type, must be one of these values

  @IsString()
  @IsNotEmpty()
  title: string; // Title of the page

  @IsString()
  @IsNotEmpty()
  content: string; // Page content in HTML or markdown format
}
