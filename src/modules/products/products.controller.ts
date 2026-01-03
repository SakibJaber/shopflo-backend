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
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProductService } from 'src/modules/products/products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';
import { ProductVariantDto } from './dto/product-variant.dto';
import { UpdateVariantDto } from 'src/modules/products/dto/update-product-variant.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File, // Single file, not array
  ) {
    try {
      const product = await this.productService.create(createProductDto, file);

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Product created successfully',
        data: product,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to create product',
      );
    }
  }

  @Patch(':id/variants')
  @UseGlobalFileInterceptor({
    fieldName: ['frontImage', 'backImage', 'leftImage', 'rightImage'],
    maxCount: 20,
  })
  async addVariants(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles()
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      leftImage?: Express.Multer.File[]; // New
      rightImage?: Express.Multer.File[]; // New
    },
  ) {
    try {
      // Convert size to array if it's a string
      const sizeArray = Array.isArray(body.size) ? body.size : [body.size];

      // Create the variant DTO
      const productVariantDtos: ProductVariantDto[] = [
        {
          color: body.color, // Keep as string, will be converted to ObjectId in service
          size: sizeArray, // Keep as string array, will be converted in service
          status: body.status,
          stockStatus: body.stockStatus,
          frontImage: '', // Will be populated by file upload
          backImage: '', // Will be populated by file upload
          leftImage: '', // Will be populated by file upload
          rightImage: '', // Will be populated by file upload
        },
      ];

      const updatedProduct = await this.productService.addVariants(
        id,
        productVariantDtos,
        files,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Variants added successfully',
        data: updatedProduct,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message || 'Product not found',
          data: null,
        };
      }
      throw new BadRequestException(error.message || 'Failed to add variants');
    }
  }

  @Get()
  async findAll(@Query() query: any) {
    try {
      const result = await this.productService.findAll(query);
      return {
        message: 'Products fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch products',
      );
    }
  }

  @Get('popular')
  async getPopularProducts(@Query() query: any) {
    try {
      const result = await this.productService.getPopularProducts(query);
      return {
        message: 'Popular products fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch popular products',
      );
    }
  }

  @Get('sync-stats')
  async syncStats() {
    try {
      const result = await this.productService.syncAllProductStats();
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Product stats synchronized successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to synchronize product stats',
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const product = await this.productService.findOne(id);
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      return {
        message: 'Product fetched successfully',
        data: product,
      };
    } catch (error) {
      throw new NotFoundException(error.message || 'Product not found');
    }
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({
    fieldName: ['image', 'frontImage', 'backImage', 'leftImage', 'rightImage'],
    maxCount: 1,
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      leftImage?: Express.Multer.File[];
      rightImage?: Express.Multer.File[];
    },
  ) {
    try {
      const updatedProduct = await this.productService.update(
        id,
        updateProductDto,
        files,
      );
      if (!updatedProduct) {
        throw new NotFoundException('Product not found');
      }
      return {
        message: 'Product updated successfully',
        data: updatedProduct,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to update product',
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.productService.remove(id);
      return {
        message: 'Product deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException(error.message || 'Product not found');
    }
  }

  @Patch(':productId/variants/:variantId')
  @UseGlobalFileInterceptor({
    fieldName: ['frontImage', 'backImage', 'leftImage', 'rightImage'],
    maxCount: 20,
  })
  async updateVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() updateVariantDto: UpdateVariantDto,
    @UploadedFiles()
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      leftImage?: Express.Multer.File[]; // New
      rightImage?: Express.Multer.File[]; // New
    },
  ) {
    try {
      if (typeof updateVariantDto.size === 'string') {
        updateVariantDto.size = [updateVariantDto.size]; // Convert string to array
      }
      const updatedProduct = await this.productService.updateVariant(
        productId,
        variantId,
        updateVariantDto,
        files,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Variant updated successfully',
        data: updatedProduct,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      throw new BadRequestException(
        error.message || 'Failed to update variant',
      );
    }
  }

  @Delete(':productId/variants/:variantId')
  async removeVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    try {
      await this.productService.removeVariant(productId, variantId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Variant deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      throw new BadRequestException(
        error.message || 'Failed to delete variant',
      );
    }
  }

  @Get(':id/related')
  async getRelatedProducts(@Param('id') id: string, @Query() query: any) {
    try {
      const result = await this.productService.getRelatedProducts(id, query);
      return {
        message: 'Related products fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch related products',
      );
    }
  }
}
