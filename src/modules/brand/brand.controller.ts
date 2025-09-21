import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';
import { BrandService } from 'src/modules/brand/brand.service';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'brandLogo', maxCount: 1 })
  async create(
    @Body() createBrandDto: CreateBrandDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Brand logo is required');
      }
      const brand = await this.brandService.create(createBrandDto, file);

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Brand created successfully',
        data: brand,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create brand');
    }
  }

  @Get()
  async findAll(@Query() query: any) {
    try {
      const result = await this.brandService.findAll(query);
      return {
        message: 'Brands fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch brands');
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const brand = await this.brandService.findOne(id);
      if (!brand) {
        throw new NotFoundException('Brand not found');
      }
      return {
        message: 'Brand fetched successfully',
        data: brand,
      };
    } catch (error) {
      throw new NotFoundException(error.message || 'Brand not found');
    }
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'brandLogo', maxCount: 1 })
  async update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const updatedBrand = await this.brandService.update(
        id,
        updateBrandDto,
        file,
      );
      if (!updatedBrand) {
        throw new NotFoundException('Brand not found');
      }
      return {
        message: 'Brand updated successfully',
        data: updatedBrand,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update brand');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.brandService.remove(id);
      return {
        message: 'Brand deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException(error.message || 'Brand not found');
    }
  }
}
