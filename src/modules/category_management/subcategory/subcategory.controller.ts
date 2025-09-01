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
    const subcategory = await this.subcategoryService.create(
      createSubcategoryDto,
      file,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Subcategory created successfully',
      data: subcategory,
    };
  }

  @Get()
  async findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('parentCategoryId') parentCategoryId: string,
  ) {
    const result = await this.subcategoryService.findAll(
      page,
      limit,
      parentCategoryId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Subcategories fetched successfully',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const subcategory = await this.subcategoryService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Subcategory fetched successfully',
      data: subcategory,
    };
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'image' })
  async update(
    @Param('id') id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const updated = await this.subcategoryService.update(
      id,
      updateSubcategoryDto,
      file,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Subcategory updated successfully',
      data: updated,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.subcategoryService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Subcategory deleted successfully',
    };
  }
}
