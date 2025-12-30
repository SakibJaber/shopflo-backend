import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UploadedFiles,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { IconsService } from './icon.service';
import { CreateIconDto } from './dto/create-icon.dto';
import { UpdateIconDto } from './dto/update-icon.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('icons')
export class IconsController {
  constructor(private readonly iconsService: IconsService) {}

  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'icon', maxCount: 15 })
  async create(
    @Body() dto: CreateIconDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      const icon = await this.iconsService.create(dto, files);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Icon created successfully',
        data: icon,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to create icon',
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

      const result = await this.iconsService.findAll(
        validatedPage,
        validatedLimit,
        search,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Icons fetched successfully',
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
        message: error.message || 'Failed to fetch icons',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const icon = await this.iconsService.findOne(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Icon fetched successfully',
        data: icon,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Icon not found',
        data: null,
      };
    }
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'icon', maxCount: 15 })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIconDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    try {
      const updated = await this.iconsService.update(id, dto, files);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Icon updated successfully',
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update icon',
        data: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.iconsService.remove(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Icon deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to delete icon',
        data: null,
      };
    }
  }
}
