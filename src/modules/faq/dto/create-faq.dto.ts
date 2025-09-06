import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFAQDto {
  @IsString()
  @IsNotEmpty()
  question: string; // Question text

  @IsString()
  @IsNotEmpty()
  answer: string; // Answer text

  @IsOptional()
  isActive?: boolean; // Optional: Whether the FAQ is active or not
}
