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
import { HttpStatus } from '@nestjs/common';

@Controller('sizes')
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Post()
  async create(@Body() dto: CreateSizeDto) {
    try {
      const createdSize = await this.sizesService.create(dto);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Size created successfully',
        data: createdSize,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to create size',
        data: null,
      };
    }
  }

  @Get()
  async findAll(@Query() query: QuerySizeDto) {
    try {
      const result = await this.sizesService.findAll(query);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Sizes fetched successfully',
        data: result.items,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch sizes',
        data: null,
        meta: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const size = await this.sizesService.findOne(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Size fetched successfully',
        data: size,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Size not found',
        data: null,
      };
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSizeDto) {
    try {
      const updatedSize = await this.sizesService.update(id, dto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Size updated successfully',
        data: updatedSize,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update size',
        data: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.sizesService.remove(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Size deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Size not found',
        data: null,
      };
    }
  }
}
