import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import {
  AddToCartDto,
  UpdateCartItemDto,
} from 'src/modules/cart/dto/create-cart.dto';

@Controller('carts')
@UseGuards(JwtAuthGuard) 
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('user/:userId')
  async getCart(@Param('userId') userId: string) {
    const cart = await this.cartService.getCart(userId);
    return { message: 'Cart fetched successfully', data: cart };
  }

  @Post('user/:userId')
  async addToCart(
    @Param('userId') userId: string,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const cart = await this.cartService.addToCart(userId, addToCartDto);
    return { message: 'Product added to cart', data: cart };
  }

  @Patch('user/:userId/item/:productId')
  async updateCartItem(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateCartItem(
      userId,
      productId,
      updateCartItemDto,
    );
    return { message: 'Cart item updated', data: cart };
  }

  @Delete('user/:userId/item/:productId')
  async removeFromCart(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    const cart = await this.cartService.removeFromCart(userId, {
      product: productId,
    });
    return { message: 'Product removed from cart', data: cart };
  }

  @Post('user/:userId/checkout')
  async checkout(@Param('userId') userId: string) {
    const cart = await this.cartService.checkout(userId);
    return { message: 'Checkout successful', data: cart };
  }
}
