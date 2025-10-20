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
    file?: Express.Multer.File,
  ): Promise<Product> {
    try {
      const discountedPrice =
        createProductDto.price -
        createProductDto.price * (createProductDto.discountPercentage / 100);

      let thumbnail: string | undefined;

      if (file) {
        thumbnail = await this.fileUploadService.handleUpload(file);
      } else {
        throw new BadRequestException('Product thumbnail image is required');
      }

      const createdProduct = new this.productModel({
        ...createProductDto,
        discountedPrice,
        thumbnail,
      });

      return await createdProduct.save();
    } catch (error) {
      // Log the actual error for debugging
      console.error('Product creation error:', error);

      // If file was uploaded but product creation failed, delete the file
      if (file) {
        try {
          const uploadedUrl = await this.fileUploadService.handleUpload(file);
          await this.fileUploadService.deleteFile(uploadedUrl);
        } catch (deleteError) {
          console.error('Failed to cleanup file:', deleteError);
        }
      }

      throw new BadRequestException(error.message);
    }
  }

  async addVariants(
    productId: string,
    productVariantDtos: ProductVariantDto[],
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      leftImage?: Express.Multer.File[];
      rightImage?: Express.Multer.File[];
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
      leftImage?: Express.Multer.File[];
      rightImage?: Express.Multer.File[];
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
      // Process new leftImage field
      if (files.leftImage && files.leftImage[i]) {
        variant.leftImage = await this.fileUploadService.handleUpload(
          files.leftImage[i],
        );
      }

      // Process new rightImage field
      if (files.rightImage && files.rightImage[i]) {
        variant.rightImage = await this.fileUploadService.handleUpload(
          files.rightImage[i],
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
      color,
      size,
      brand,
      price,
      minPrice,
      maxPrice,
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

      // Apply brand filter
      if (brand) {
        if (Array.isArray(brand)) {
          // Handle multiple brands as array
          const brandFilters = brand
            .map((b) => {
              if (!Types.ObjectId.isValid(b)) {
                throw new BadRequestException('Invalid brand ID');
              }
              return [{ brand: b }, { brand: new Types.ObjectId(b) }];
            })
            .flat();

          filter.$or = [...(filter.$or || []), { $or: brandFilters }];
        } else {
          // Handle single brand
          if (!Types.ObjectId.isValid(brand)) {
            throw new BadRequestException('Invalid brand ID');
          }
          filter.$or = [
            ...(filter.$or || []),
            { brand: brand },
            { brand: new Types.ObjectId(brand) },
          ];
        }
      }

      // Apply color filter (search in variants)
      if (color) {
        if (Array.isArray(color)) {
          // Handle multiple colors
          const colorObjectIds = color.map((c) => {
            if (!Types.ObjectId.isValid(c)) {
              throw new BadRequestException('Invalid color ID');
            }
            return new Types.ObjectId(c);
          });
          filter['variants.color'] = { $in: colorObjectIds };
        } else {
          // Handle single color
          if (!Types.ObjectId.isValid(color)) {
            throw new BadRequestException('Invalid color ID');
          }
          filter['variants.color'] = new Types.ObjectId(color);
        }
      }

      // Apply size filter (search in variants)
      if (size) {
        if (Array.isArray(size)) {
          // Handle multiple sizes
          const sizeObjectIds = size.map((s) => {
            if (!Types.ObjectId.isValid(s)) {
              throw new BadRequestException('Invalid size ID');
            }
            return new Types.ObjectId(s);
          });
          filter['variants.size'] = { $in: sizeObjectIds };
        } else {
          // Handle single size
          if (!Types.ObjectId.isValid(size)) {
            throw new BadRequestException('Invalid size ID');
          }
          filter['variants.size'] = new Types.ObjectId(size);
        }
      }

      // Initialize price filter object
      const priceFilter: any = {};

      // Handle price range format like "1265-5456"
      if (price) {
        const priceRange = price
          .split('-')
          .map((p: string) => parseInt(p.trim()));

        if (
          priceRange.length === 2 &&
          !isNaN(priceRange[0]) &&
          !isNaN(priceRange[1])
        ) {
          if (priceRange[0] > priceRange[1]) {
            throw new BadRequestException(
              'Minimum price cannot be greater than maximum price',
            );
          }

          priceFilter.$gte = priceRange[0];
          priceFilter.$lte = priceRange[1];
        } else {
          throw new BadRequestException(
            'Invalid price range format. Use format: minPrice-maxPrice (e.g., 1265-5456)',
          );
        }
      }

      // Handle separate minPrice and maxPrice parameters (can be used with or without price range)
      if (minPrice) {
        const min = parseInt(minPrice);
        if (isNaN(min) || min < 0) {
          throw new BadRequestException(
            'Invalid minPrice. Must be a positive number.',
          );
        }
        priceFilter.$gte = min;
      }

      if (maxPrice) {
        const max = parseInt(maxPrice);
        if (isNaN(max) || max < 0) {
          throw new BadRequestException(
            'Invalid maxPrice. Must be a positive number.',
          );
        }
        priceFilter.$lte = max;
      }

      // Validate that minPrice is not greater than maxPrice when both are provided
      if (
        priceFilter.$gte &&
        priceFilter.$lte &&
        priceFilter.$gte > priceFilter.$lte
      ) {
        throw new BadRequestException(
          'minPrice cannot be greater than maxPrice',
        );
      }

      // Apply price filter if any price conditions were set
      if (Object.keys(priceFilter).length > 0) {
        filter.discountedPrice = priceFilter;
      }

      // console.log('Final filter object:', JSON.stringify(filter, null, 2));

      // Handle sorting
      const sortOptions: any = {};
      if (sortBy) {
        const sortOrder = order === 'asc' ? 1 : -1;

        // Map common sort fields to actual database fields
        const sortFieldMap: { [key: string]: string } = {
          title: 'productName',
          name: 'productName',
          price: 'discountedPrice',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
        };

        const actualSortField = sortFieldMap[sortBy] || sortBy;
        sortOptions[actualSortField] = sortOrder;
      } else {
        sortOptions.createdAt = -1; // Default sort
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
      image?: Express.Multer.File[];
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      leftImage?: Express.Multer.File[];
      rightImage?: Express.Multer.File[];
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

    // Handle thumbnail update
    if (files?.image?.[0]) {
      if (existing.thumbnail) {
        await this.fileUploadService.deleteFile(existing.thumbnail);
      }
      updateProductDto.thumbnail = await this.fileUploadService.handleUpload(
        files.image[0],
      );
    }

    // Handle variant images if provided
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
      leftImage?: Express.Multer.File[];
      rightImage?: Express.Multer.File[];
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

      // Handle new leftImage field
      if (files.leftImage && files.leftImage[0]) {
        if (variant.leftImage) {
          await this.fileUploadService.deleteFile(variant.leftImage);
        }
        variant.leftImage = await this.fileUploadService.handleUpload(
          files.leftImage[0],
        );
      }

      // Handle new rightImage field
      if (files.rightImage && files.rightImage[0]) {
        if (variant.rightImage) {
          await this.fileUploadService.deleteFile(variant.rightImage);
        }
        variant.rightImage = await this.fileUploadService.handleUpload(
          files.rightImage[0],
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

    // Handle new optional image fields
    if (updateVariantDto.leftImage !== undefined) {
      variant.leftImage = updateVariantDto.leftImage;
    }

    if (updateVariantDto.rightImage !== undefined) {
      variant.rightImage = updateVariantDto.rightImage;
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

    // Delete all associated files including new ones
    const filesToDelete = [
      variant.frontImage,
      variant.backImage,
      variant.leftImage,
      variant.rightImage,
    ].filter(Boolean);

    for (const fileUrl of filesToDelete) {
      if (fileUrl) {
        await this.fileUploadService.deleteFile(fileUrl);
      }
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

  async getPopularProducts(query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    try {
      // First, try to find products with salesCount > 0
      let [data, total] = await Promise.all([
        this.productModel
          .find({ salesCount: { $gt: 0 } })
          .populate('category', 'name')
          .populate('subcategory', 'name')
          .populate('brand', 'brandName brandLogo')
          .populate('variants.color', 'name hexValue')
          .populate('variants.size', 'name')
          .sort({ salesCount: -1, viewCount: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productModel.countDocuments({ salesCount: { $gt: 0 } }),
      ]);

      // If no products with sales, get the most recently added products as fallback
      if (data.length === 0) {
        [data, total] = await Promise.all([
          this.productModel
            .find({})
            .populate('category', 'name')
            .populate('subcategory', 'name')
            .populate('brand', 'brandName brandLogo')
            .populate('variants.color', 'name hexValue')
            .populate('variants.size', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec(),
          this.productModel.countDocuments({}),
        ]);
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Popular products fetched successfully',
        data,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getPopularProducts:', error);
      throw new BadRequestException(
        error.message || 'Failed to fetch popular products',
      );
    }
  }

  async getRelatedProducts(productId: string, query: any) {
    const { page = 1, limit = 4 } = query;
    const skip = (page - 1) * limit;

    try {
      // First, get the current product with minimal population to avoid circular references
      const currentProduct = await this.productModel
        .findById(productId, 'category subcategory brand')
        .lean();

      if (!currentProduct) {
        throw new NotFoundException('Product not found');
      }

      // Extract IDs, handling both ObjectId and populated objects
      const getReferenceId = (ref: any) => {
        if (!ref) return null;
        return ref._id ? ref._id.toString() : ref.toString();
      };

      const categoryId = getReferenceId(currentProduct.category);
      const subcategoryId = getReferenceId(currentProduct.subcategory);
      const brandId = getReferenceId(currentProduct.brand);

      // Build the filter for related products
      const filter: any = {
        _id: { $ne: new Types.ObjectId(productId) }, // Exclude current product
      };

      // Define the type for filter conditions
      type FilterCondition = {
        category?: Types.ObjectId;
        subcategory?: Types.ObjectId;
        brand?: Types.ObjectId;
      };
      
      // Add conditions for category, subcategory, or brand if they exist
      const orConditions: FilterCondition[] = [];
      
      if (categoryId) {
        orConditions.push({ category: new Types.ObjectId(categoryId) });
      }
      
      if (subcategoryId) {
        orConditions.push({ subcategory: new Types.ObjectId(subcategoryId) });
      }
      
      if (brandId) {
        orConditions.push({ brand: new Types.ObjectId(brandId) });
      }

      // If no valid conditions, fall back to any product (except current one)
      if (orConditions.length === 0) {
        // Just get any other products
        const [data, total] = await Promise.all([
          this.productModel
            .find({ _id: { $ne: new Types.ObjectId(productId) } })
            .populate('category', 'name')
            .populate('subcategory', 'name')
            .populate('brand', 'brandName brandLogo')
            .populate('variants.color', 'name hexValue')
            .populate('variants.size', 'name')
            .sort({ createdAt: -1 }) // Sort by newest first as fallback
            .limit(limit)
            .skip(skip)
            .exec(),
          this.productModel.countDocuments({ _id: { $ne: new Types.ObjectId(productId) } }),
        ]);

        return {
          success: true,
          statusCode: 200,
          message: 'Related products fetched successfully',
          data,
          meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        };
      }

      filter.$or = orConditions;

      const [data, total] = await Promise.all([
        this.productModel
          .find(filter)
          .populate('category', 'name')
          .populate('subcategory', 'name')
          .populate('brand', 'brandName brandLogo')
          .populate('variants.color', 'name hexValue')
          .populate('variants.size', 'name')
          .sort({ salesCount: -1, viewCount: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productModel.countDocuments(filter),
      ]);

      return {
        success: true,
        statusCode: 200,
        message: 'Related products fetched successfully',
        data,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getRelatedProducts:', error);
      throw new BadRequestException(
        error.message || 'Failed to fetch related products',
      );
    }
  }
}
