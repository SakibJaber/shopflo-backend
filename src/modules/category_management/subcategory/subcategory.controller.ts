import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UploadedFile,
  HttpStatus,
  Patch,
  Query,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { SubcategoryService } from './subcategory.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('subcategories')
export class SubcategoryController {
  constructor(private readonly subcategoryService: SubcategoryService) {}

  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'image' })
  async create(
    @Body() createSubcategoryDto: CreateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const subcategory = await this.subcategoryService.create(
        createSubcategoryDto,
        file,
      );
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Subcategory created successfully',
        data: subcategory,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to create subcategory',
        data: null,
      };
    }
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('parentCategoryId') parentCategoryId: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.subcategoryService.findAll(
        page,
        limit,
        parentCategoryId,    
        search,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Subcategories fetched successfully',
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
           ...(search && { search }), 
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch subcategories',
        data: null,
        meta: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const subcategory = await this.subcategoryService.findOne(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Subcategory fetched successfully',
        data: subcategory,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Subcategory not found',
        data: null,
      };
    }
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'image' })
  async update(
    @Param('id') id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Ensure that parentCategoryId is a string and is valid
    if (
      updateSubcategoryDto.parentCategoryId &&
      typeof updateSubcategoryDto.parentCategoryId === 'object' &&
      'toString' in updateSubcategoryDto.parentCategoryId &&
      typeof (
        updateSubcategoryDto.parentCategoryId as { toString: () => string }
      ).toString === 'function'
    ) {
      updateSubcategoryDto.parentCategoryId = (
        updateSubcategoryDto.parentCategoryId as { toString: () => string }
      ).toString(); // Ensure it's a string
    }

    // Validate parentCategoryId presence and format
    if (
      !updateSubcategoryDto.parentCategoryId ||
      !isValidObjectId(updateSubcategoryDto.parentCategoryId)
    ) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'parentCategoryId is required and must be a valid ObjectId.',
        data: null,
      };
    }

    try {
      const updated = await this.subcategoryService.update(
        id,
        updateSubcategoryDto,
        file,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Subcategory updated successfully',
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update subcategory',
        data: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.subcategoryService.remove(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Subcategory deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Subcategory not found',
        data: null,
      };
    }
  }
}
