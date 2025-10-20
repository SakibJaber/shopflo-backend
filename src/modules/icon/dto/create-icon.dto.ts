import { IsNotEmpty, IsString } from 'class-validator';

export class CreateIconDto {
  @IsString()
  @IsNotEmpty()
  iconName: string;

  @IsString()
  @IsNotEmpty()
  iconUrl: string;
}
