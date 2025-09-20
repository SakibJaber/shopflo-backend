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
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { QueryColorDto } from './dto/query-color.dto';
import { ColorsService } from 'src/modules/color/color.service';
import { HttpStatus } from '@nestjs/common';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Post()
  async create(@Body() dto: CreateColorDto) {
    try {
      const createdColor = await this.colorsService.create(dto);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Color created successfully',
        data: createdColor,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to create color',
        data: null,
      };
    }
  }

  @Get()
  async findAll(@Query() query: QueryColorDto) {
    try {
      const result = await this.colorsService.findAll(query);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Colors fetched successfully',
        data: result.items,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch colors',
        data: null,
        meta: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const color = await this.colorsService.findOne(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Color fetched successfully',
        data: color,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Color not found',
        data: null,
      };
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    try {
      const updatedColor = await this.colorsService.update(id, dto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Color updated successfully',
        data: updatedColor,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update color',
        data: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.colorsService.remove(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Color deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Color not found',
        data: null,
      };
    }
  }
}
