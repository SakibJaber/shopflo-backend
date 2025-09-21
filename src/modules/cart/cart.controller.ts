import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import {
  AddToCartDto,
  UpdateCartItemDto,
  RemoveFromCartDto,
} from './dto/create-cart.dto';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('user/:userId')
  async getCart(@Param('userId') userId: string, @Req() req) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const cart = await this.cartService.getCart(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Cart fetched successfully',
        data: cart,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch cart',
        data: null,
      };
    }
  }

  @Get('user/:userId/details')
  async getCartWithDetails(@Param('userId') userId: string, @Req() req) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const cart = await this.cartService.getCartWithDetails(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Cart with details fetched successfully',
        data: cart,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch cart details',
        data: null,
      };
    }
  }

  @Get('user/:userId/count')
  async getCartCount(@Param('userId') userId: string, @Req() req) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const count = await this.cartService.getCartCount(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Cart count fetched successfully',
        data: { count },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch cart count',
        data: null,
      };
    }
  }

  @Post('user/:userId')
  async addToCart(
    @Param('userId') userId: string,
    @Body() addToCartDto: AddToCartDto,
    @Req() req,
  ) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const cart = await this.cartService.addToCart(userId, addToCartDto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Product added to cart successfully',
        data: cart,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      } else if (error instanceof BadRequestException) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to add product to cart',
        data: null,
      };
    }
  }

  @Patch('user/:userId/item/:productId/:variantId')
  async updateCartItem(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Req() req,
  ) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const cart = await this.cartService.updateCartItem(
        userId,
        productId,
        variantId,
        updateCartItemDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Cart item updated successfully',
        data: cart,
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
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update cart item',
        data: null,
      };
    }
  }

  @Delete('user/:userId/item')
  async removeFromCart(
    @Param('userId') userId: string,
    @Body() removeFromCartDto: RemoveFromCartDto,
    @Req() req,
  ) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const cart = await this.cartService.removeFromCart(
        userId,
        removeFromCartDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Product removed from cart successfully',
        data: cart,
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
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to remove product from cart',
        data: null,
      };
    }
  }

  @Delete('user/:userId/clear')
  async clearCart(@Param('userId') userId: string, @Req() req) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const cart = await this.cartService.clearCart(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Cart cleared successfully',
        data: cart,
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
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to clear cart',
        data: null,
      };
    }
  }

  @Post('user/:userId/checkout')
  async checkout(@Param('userId') userId: string, @Req() req) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
      };
    }

    try {
      const cart = await this.cartService.checkout(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Checkout successful',
        data: cart,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      } else if (error instanceof BadRequestException) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to checkout',
        data: null,
      };
    }
  }
}
