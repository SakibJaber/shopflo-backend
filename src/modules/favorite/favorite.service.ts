import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/schema/product.schema';
import { Favorite, FavoriteDocument } from 'src/modules/favorite/schema/favorite,schema';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async addToFavorites(userId: string, productId: string): Promise<Favorite> {
    try {
      // Validate ObjectIds
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) {
        throw new BadRequestException('Invalid user or product ID');
      }

      // Check if product exists
      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if already favorited
      const existing = await this.favoriteModel.findOne({
        user: new Types.ObjectId(userId),
        product: new Types.ObjectId(productId),
      });

      if (existing) {
        throw new ConflictException('Product already in favorites');
      }

      // Create favorite
      const favorite = new this.favoriteModel({
        user: new Types.ObjectId(userId),
        product: new Types.ObjectId(productId),
      });

      return await favorite.save();
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to add to favorites');
    }
  }

  async removeFromFavorites(userId: string, productId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) {
        throw new BadRequestException('Invalid user or product ID');
      }

      const result = await this.favoriteModel.findOneAndDelete({
        user: new Types.ObjectId(userId),
        product: new Types.ObjectId(productId),
      });

      if (!result) {
        throw new NotFoundException('Favorite not found');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to remove from favorites');
    }
  }

  async getUserFavorites(userId: string, query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      const [favorites, total] = await Promise.all([
        this.favoriteModel
          .find({ user: new Types.ObjectId(userId) })
          .populate({
            path: 'product',
            populate: [
              { path: 'category', select: 'name' },
              { path: 'subcategory', select: 'name' },
              { path: 'brand', select: 'brandName brandLogo' },
              { path: 'variants.color', select: 'name hexValue' },
              { path: 'variants.size', select: 'name' },
            ],
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.favoriteModel.countDocuments({ user: new Types.ObjectId(userId) }),
      ]);

      // Extract products from favorites
      const products = favorites
        .map(fav => fav.product)
        .filter(product => product != null);

      return {
        success: true,
        statusCode: 200,
        message: 'Favorite products fetched successfully',
        data: products,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch favorite products',
      );
    }
  }

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) {
        return false;
      }

      const favorite = await this.favoriteModel.findOne({
        user: new Types.ObjectId(userId),
        product: new Types.ObjectId(productId),
      });

      return !!favorite;
    } catch (error) {
      return false;
    }
  }

  async getFavoriteCount(userId: string): Promise<number> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      return await this.favoriteModel.countDocuments({
        user: new Types.ObjectId(userId),
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get favorite count');
    }
  }
}