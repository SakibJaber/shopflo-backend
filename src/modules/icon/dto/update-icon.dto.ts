import { PartialType } from '@nestjs/mapped-types';
import { CreateIconDto } from './create-icon.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateIconDto extends PartialType(CreateIconDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  existingIcons?: string[];
}
