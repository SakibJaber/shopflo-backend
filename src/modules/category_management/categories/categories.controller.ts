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
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryService: CategoriesService) {}

  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const category = await this.categoryService.create(dto, file);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Category created successfully',
        data: category,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to create category',
        data: null,
      };
    }
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    try {
      const validatedPage = page > 0 ? page : 1;
      const validatedLimit = limit > 0 && limit <= 100 ? limit : 10;

      const result = await this.categoryService.findAll(
        validatedPage,
        validatedLimit,
        search,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Categories fetched successfully',
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          ...(search && { search }), // Include search term in meta if provided
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch categories',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const category = await this.categoryService.findOne(id);
      if (!category) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Category not found',
          data: null,
        };
      }

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Category fetched successfully',
        data: category,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch category',
        data: null,
      };
    }
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const updated = await this.categoryService.update(id, dto, file);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Category updated successfully',
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update category',
        data: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.categoryService.remove(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Category deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to delete category',
        data: null,
      };
    }
  }
}
