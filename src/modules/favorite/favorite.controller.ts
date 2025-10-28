import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':productId')
  async addToFavorites(@Request() req, @Param('productId') productId: string) {
    try {
      const userId = req.user.userId || req.user.id;
      const favorite = await this.favoriteService.addToFavorites(
        userId,
        productId,
      );

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Product added to favorites successfully',
        data: favorite,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to add product to favorites',
        data: null,
      };
    }
  }

  @Delete(':productId')
  async removeFromFavorites(
    @Request() req,
    @Param('productId') productId: string,
  ) {
    try {
      const userId = req.user.userId || req.user.id;
      await this.favoriteService.removeFromFavorites(userId, productId);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Product removed from favorites successfully',
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to remove product from favorites',
        data: null,
      };
    }
  }

  @Get()
  async getUserFavorites(@Request() req, @Query() query: any) {
    try {
      const userId = req.user.userId || req.user.id;
      const result = await this.favoriteService.getUserFavorites(userId, query);

      return result;
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch favorite products',
        data: null,
      };
    }
  }

  @Get('check/:productId')
  async checkIsFavorite(@Request() req, @Param('productId') productId: string) {
    try {
      const userId = req.user.userId || req.user.id;
      const isFavorite = await this.favoriteService.isFavorite(
        userId,
        productId,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Favorite status checked successfully',
        data: { isFavorite },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to check favorite status',
        data: null,
      };
    }
  }

  @Get('count')
  async getFavoriteCount(@Request() req) {
    try {
      const userId = req.user.userId || req.user.id;
      const count = await this.favoriteService.getFavoriteCount(userId);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Favorite count fetched successfully',
        data: { count },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to get favorite count',
        data: null,
      };
    }
  }
}
