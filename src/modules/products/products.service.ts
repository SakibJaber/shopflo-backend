import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
  ProductVariant,
  ProductVariantDocument,
} from './schema/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { ProductVariantDto } from 'src/modules/products/dto/product-variant.dto';
import { UpdateVariantDto } from 'src/modules/products/dto/update-product-variant.dto';
import { Size } from 'src/modules/sizes/schema/size.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    try {
      const discountedPrice =
        createProductDto.price -
        createProductDto.price * (createProductDto.discountPercentage / 100);

      const createdProduct = new this.productModel({
        ...createProductDto,
        discountedPrice,
      });
      return await createdProduct.save();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async addVariants(
    productId: string,
    productVariantDtos: ProductVariantDto[],
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
  ): Promise<Product> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variantsWithImages = await this.processVariantImages(
      productVariantDtos,
      files,
    );

    // Convert color and size fields to ObjectId and create proper ProductVariant objects
    const variantsWithObjectIds = variantsWithImages.map((variant) => ({
      ...variant,
      _id: new Types.ObjectId(),
      color: new Types.ObjectId(variant.color as string),
      size: (variant.size as string[]).map(
        (sizeId) => new Types.ObjectId(sizeId),
      ),
    })) as unknown as ProductVariant[];

    product.variants.push(...variantsWithObjectIds);
    await product.save();

    return product;
  }

  private async processVariantImages(
    variants: ProductVariantDto[],
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
  ): Promise<ProductVariantDto[]> {
    const processedVariants = [...variants];

    for (let i = 0; i < processedVariants.length; i++) {
      const variant = processedVariants[i];

      if (files.frontImage && files.frontImage[i]) {
        variant.frontImage = await this.fileUploadService.handleUpload(
          files.frontImage[i],
        );
      }

      if (files.backImage && files.backImage[i]) {
        variant.backImage = await this.fileUploadService.handleUpload(
          files.backImage[i],
        );
      }
    }

    return processedVariants;
  }

  async findAll(query: any) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      subcategory,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const filter: any = {};

    try {
      // Apply search filter
      if (search) {
        filter.$or = [
          { productName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { shortDescription: { $regex: search, $options: 'i' } },
        ];
      }

      // Apply category filter - handle both string and ObjectId
      if (category) {
        if (!Types.ObjectId.isValid(category)) {
          throw new BadRequestException('Invalid category ID');
        }

        // Handle both string and ObjectId storage in database
        filter.$or = [
          { category: category }, // Match as string
          { category: new Types.ObjectId(category) }, // Match as ObjectId
        ];
      }

      // Apply subcategory filter - handle both string and ObjectId
      if (subcategory) {
        if (!Types.ObjectId.isValid(subcategory)) {
          throw new BadRequestException('Invalid subcategory ID');
        }

        // Handle both string and ObjectId storage in database
        filter.$or = [
          ...(filter.$or || []),
          { subcategory: subcategory }, // Match as string
          { subcategory: new Types.ObjectId(subcategory) }, // Match as ObjectId
        ];
      }

      const [data, total] = await Promise.all([
        this.productModel
          .find(filter)
          .populate('category', 'name')
          .populate('subcategory', 'name')
          .populate('brand', 'brandName brandLogo')
          .populate('variants.color', 'name hexValue')
          .populate('variants.size', 'name')
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productModel.countDocuments(filter),
      ]);

      return {
        success: true,
        statusCode: 200,
        message: 'Products fetched successfully',
        data,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch products',
      );
    }
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('brand', 'brandName brandLogo')
      .populate('variants.color', 'name hexValue')
      .populate('variants.size', 'name')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    files?: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
  ): Promise<Product> {
    const existing = await this.productModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    // Recalculate discounted price if price or discount percentage is updated
    if (
      updateProductDto.price !== undefined ||
      updateProductDto.discountPercentage !== undefined
    ) {
      const price = updateProductDto.price ?? existing.price;
      const discountPercentage =
        updateProductDto.discountPercentage ?? existing.discountPercentage;
      updateProductDto.discountedPrice =
        price - price * (discountPercentage / 100);
    }

    if (files && updateProductDto.variants) {
      const variantsWithImages = await this.processVariantImages(
        updateProductDto.variants,
        files,
      );
      updateProductDto.variants = variantsWithImages.map((variant) => ({
        ...variant,
        color: variant.color,
        size: variant.size,
      }));
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('brand', 'brandName brandLogo')
      .populate('variants.color', 'name hexValue')
      .populate('variants.size', 'name')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    for (const variant of product.variants) {
      if (variant.frontImage) {
        await this.fileUploadService.deleteFile(variant.frontImage);
      }
      if (variant.backImage) {
        await this.fileUploadService.deleteFile(variant.backImage);
      }
    }

    await this.productModel.findByIdAndDelete(id).exec();
  }

  async updateVariant(
    productId: string,
    variantId: string,
    updateVariantDto: UpdateVariantDto,
    files?: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
  ): Promise<Product> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variant = product.variants.find(
      (v: ProductVariantDocument) => v._id.toString() === variantId,
    );
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (files) {
      if (files.frontImage && files.frontImage[0]) {
        if (variant.frontImage) {
          await this.fileUploadService.deleteFile(variant.frontImage);
        }
        variant.frontImage = await this.fileUploadService.handleUpload(
          files.frontImage[0],
        );
      }

      if (files.backImage && files.backImage[0]) {
        if (variant.backImage) {
          await this.fileUploadService.deleteFile(variant.backImage);
        }
        variant.backImage = await this.fileUploadService.handleUpload(
          files.backImage[0],
        );
      }
    }

    if (updateVariantDto.color) {
      variant.color = new Types.ObjectId(updateVariantDto.color);
    }

    if (updateVariantDto.size) {
      variant.size = updateVariantDto.size.map(
        (sizeId) => new Types.ObjectId(sizeId),
      );
    }

    if (updateVariantDto.status) {
      variant.status = updateVariantDto.status;
    }

    if (updateVariantDto.stockStatus) {
      variant.stockStatus = updateVariantDto.stockStatus;
    }

    await product.save();
    return product;
  }

  async removeVariant(productId: string, variantId: string): Promise<void> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variant = product.variants.find(
      (v: ProductVariantDocument) => v._id.toString() === variantId,
    );
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.frontImage) {
      await this.fileUploadService.deleteFile(variant.frontImage);
    }
    if (variant.backImage) {
      await this.fileUploadService.deleteFile(variant.backImage);
    }

    product.variants = product.variants.filter(
      (v: ProductVariantDocument) => v._id.toString() !== variantId,
    );
    await product.save();
  }

  async getAvailableSizes(
    productId: string,
    variantId: string,
  ): Promise<Size[]> {
    const product = await this.productModel
      .findById(productId)
      .populate('variants.size')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variant = product.variants.find(
      (v: any) => v._id.toString() === variantId,
    );

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Ensure all sizes are populated documents
    const sizes = (variant.size as any[]).filter(
      (size) => size && typeof size === 'object' && 'name' in size,
    );

    return sizes;
  }
}
