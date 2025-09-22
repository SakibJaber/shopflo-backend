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
import { SubcategoryService } from './subcategory.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('subcategories')
export class SubcategoryController {
  constructor(private readonly subcategoryService: SubcategoryService) {}

  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async create(
    @Body() dto: CreateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const subcategory = await this.subcategoryService.create(dto, file);
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('category') category: string,
    @Query('search') search?: string,
  ) {
    try {
      const validatedPage = page > 0 ? page : 1;
      const validatedLimit = limit > 0 && limit <= 100 ? limit : 10;

      const result = await this.subcategoryService.findAll(
        validatedPage,
        validatedLimit,
        category,
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
          ...(search && { search }), // Include search term in meta if provided
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch subcategories',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const subcategory = await this.subcategoryService.findOne(id);
      if (!subcategory) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Subcategory not found',
          data: null,
        };
      }

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Subcategory fetched successfully',
        data: subcategory,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch subcategory',
        data: null,
      };
    }
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const updated = await this.subcategoryService.update(id, dto, file);
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
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to delete subcategory',
        data: null,
      };
    }
  }
}
