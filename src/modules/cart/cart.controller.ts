import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import {
  AddRegularProductToCartDto,
  RemoveFromCartDto,
  AddDesignToCartDto,
} from './dto/create-cart.dto';
import { UpdateCartItemDto } from 'src/modules/cart/dto/update-cart.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ==================== GET CART ====================
  @Get()
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async getCart(@Req() req) {
    const userId = req.user.userId;

    try {
      const cart = await this.cartService.getCartWithDetails(userId);
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

  // ==================== ADD REGULAR PRODUCT TO CART ====================
  @Post('regular')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async addRegularProductToCart(
    @Body() addRegularProductToCartDto: AddRegularProductToCartDto,
    @Req() req,
  ) {
    const userId = req.user.userId;

    try {
      const cart = await this.cartService.addRegularProductToCart(
        userId,
        addRegularProductToCartDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Product added to cart successfully',
        data: cart,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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

  // ==================== ADD DESIGN TO CART ====================
  @Post('design')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async addDesignToCart(
    @Body() addDesignToCartDto: AddDesignToCartDto,
    @Req() req,
  ) {
    const userId = req.user.userId;

    try {
      const cart = await this.cartService.addDesignToCart(
        userId,
        addDesignToCartDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Designed product added to cart successfully',
        data: cart,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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
        message: error.message || 'Failed to add design to cart',
        data: null,
      };
    }
  }

  // ==================== GET ITEM DETAILS ====================
  @Get('item/:itemId')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async getItemDetails(@Param('itemId') itemId: string, @Req() req) {
    const userId = req.user.userId;

    try {
      const itemDetails = await this.cartService.getItemDetails(userId, itemId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Item details fetched successfully',
        data: itemDetails,
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
        message: error.message || 'Failed to fetch item details',
        data: null,
      };
    }
  }

  // ==================== UPDATE CART ITEM ====================
  @Put('item/:itemId')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async updateCartItem(
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Req() req,
  ) {
    const userId = req.user.userId;

    try {
      const cart = await this.cartService.updateCartItem(
        userId,
        itemId,
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

  // ==================== REMOVE CART ITEM ====================
  @Delete('item')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async removeFromCart(
    @Body() removeFromCartDto: RemoveFromCartDto,
    @Req() req,
  ) {
    const userId = req.user.userId;

    try {
      const cart = await this.cartService.removeCartItem(
        userId,
        removeFromCartDto.cartItemId,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Item removed from cart successfully',
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
        message: error.message || 'Failed to remove item from cart',
        data: null,
      };
    }
  }

  // ==================== CLEAR CART ====================
  @Delete('clear')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  async clearCart(@Req() req) {
    const userId = req.user.userId;

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
}
