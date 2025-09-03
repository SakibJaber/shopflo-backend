import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SizesService } from './sizes.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { QuerySizeDto } from './dto/query-size.dto';


@Controller('sizes')
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Post()
  create(@Body() dto: CreateSizeDto) {
    return this.sizesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QuerySizeDto) {
    return this.sizesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sizesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSizeDto) {
    return this.sizesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sizesService.remove(id);
  }
}
