import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateCartDto,
  AddToCartDto,
  UpdateCartItemDto,
  RemoveFromCartDto,
} from 'src/modules/cart/dto/create-cart.dto';
import { Cart, CartDocument } from 'src/modules/cart/schema/cart.schema';

import { Product } from 'src/modules/products/schema/product.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async createCart(createCartDto: CreateCartDto): Promise<Cart> {
    const cart = new this.cartModel(createCartDto);
    return cart.save();
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    let cart = await this.cartModel.findOne({ user: userId, isActive: true });

    if (!cart) {
      cart = new this.cartModel({
        user: userId,
        items: [],
        isActive: true,
      });
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === addToCartDto.product,
    );

    if (existingItem) {
      existingItem.quantity += addToCartDto.quantity;
    } else {
      cart.items.push({
        product: new Types.ObjectId(addToCartDto.product), // Convert string to ObjectId
        quantity: addToCartDto.quantity,
        isSelected: false, // Add the required isSelected property
      });
    }

    await cart.save();
    return cart;
  }

  async updateCartItem(
    userId: string,
    productId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.cartModel.findOne({ user: userId, isActive: true });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (updateCartItemDto.quantity) {
      item.quantity = updateCartItemDto.quantity;
    }
    if (updateCartItemDto.isSelected !== undefined) {
      item.isSelected = updateCartItemDto.isSelected;
    }

    await cart.save();
    return cart;
  }

  async removeFromCart(
    userId: string,
    removeFromCartDto: RemoveFromCartDto,
  ): Promise<Cart> {
    const cart = await this.cartModel.findOne({ user: userId, isActive: true });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== removeFromCartDto.product,
    );
    await cart.save();
    return cart;
  }

  async getCart(userId: string): Promise<Cart> {
    const cart = await this.cartModel
      .findOne({ user: userId, isActive: true })
      .populate('items.product');
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  async checkout(userId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({ user: userId, isActive: true });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Perform checkout logic here (e.g., mark cart as completed, calculate totals, etc.)
    cart.isActive = false;
    await cart.save();
    return cart;
  }
}
