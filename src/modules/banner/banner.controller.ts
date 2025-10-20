// src/modules/banners/banners.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannersService } from 'src/modules/banner/banner.service';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Image is required',
          data: null,
        };
      }

      const banner = await this.bannersService.create(createBannerDto, file);

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Banner created successfully',
        data: banner,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to create banner',
        data: null,
      };
    }
  }

  @Get()
  async findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    try {
      const result = await this.bannersService.findAll(page, limit);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Banners fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch banners',
        data: null,
      };
    }
  }

  @Get('active')
  async findActiveBanners() {
    try {
      const banners = await this.bannersService.findActiveBanners();

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Active banners fetched successfully',
        data: banners,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch active banners',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const banner = await this.bannersService.findOne(id);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Banner fetched successfully',
        data: banner,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Banner not found',
        data: null,
      };
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const banner = await this.bannersService.update(id, updateBannerDto, file);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Banner updated successfully',
        data: banner,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update banner',
        data: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.bannersService.remove(id);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Banner deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to delete banner',
        data: null,
      };
    }
  }
}