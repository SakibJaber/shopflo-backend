import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { QueryColorDto } from './dto/query-color.dto';
import { ColorsService } from 'src/modules/color/color.service';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Post()
  create(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryColorDto) {
    return this.colorsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.colorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    return this.colorsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.colorsService.remove(id);
  }
}
