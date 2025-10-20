import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateChartDto {
  @IsString()
  chartName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
