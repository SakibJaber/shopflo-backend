import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schema/cart.schema';
import { Product, ProductDocument } from '../products/schema/product.schema';
import {
  AddToCartDto,
  UpdateCartItemDto,
  RemoveFromCartDto,
} from './dto/create-cart.dto';
import { ProductStatus } from 'src/common/enum/product.status.enum';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async createCart(userId: string): Promise<CartDocument> {
    try {
      const cart = new this.cartModel({
        user: new Types.ObjectId(userId),
        items: [],
        isActive: true,
      });
      return await cart.save();
    } catch (error: any) {
      if (error.code === 11000) {
        const existingCart = await this.cartModel.findOne({
          user: new Types.ObjectId(userId),
          isActive: true,
        });
        if (!existingCart) {
          throw new NotFoundException('Cart not found');
        }
        return existingCart;
      }
      throw new InternalServerErrorException(
        `Failed to create cart: ${error.message}`,
      );
    }
  }

  async getCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId), isActive: true })
      .populate({
        path: 'items.product',
        select:
          'productName brand price discountPercentage discountedPrice variants',
        populate: [
          {
            path: 'variants.color',
            select: 'name hexValue',
          },
          {
            path: 'variants.size',
            select: 'name',
          },
        ],
      })
      .exec();

    if (!cart) {
      return await this.createCart(userId);
    }

    return cart;
  }

  async getCartWithDetails(userId: string) {
    const cart = await this.getCart(userId);

    // Calculate totals
    let itemsTotal = 0;
    const itemsWithDetails = cart.items.map((item) => {
      const product = item.product as any;
      const variant = product.variants.find(
        (v: any) => v._id.toString() === item.variant.toString(),
      );

      if (!variant) {
        throw new BadRequestException(
          `Variant not found for product ${product._id}`,
        );
      }

      const itemPrice = product.discountedPrice;
      const itemTotal = itemPrice * item.quantity;
      itemsTotal += itemTotal;

      return {
        ...item,
        product: {
          _id: product._id,
          productName: product.productName,
          brand: product.brand,
          price: product.price,
          discountPercentage: product.discountPercentage,
          discountedPrice: product.discountedPrice,
        },
        variant: {
          _id: variant._id,
          color: variant.color,
          size: variant.size,
          frontImage: variant.frontImage,
          backImage: variant.backImage,
        },
        price: itemPrice,
        total: itemTotal,
      };
    });

    const totalAmount = itemsTotal;

    return {
      items: itemsWithDetails,
      summary: {
        itemsTotal,
        totalAmount,
      },
    };
  }

  async addToCart(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartDocument> {
    // Validate product and variant
    const product = await this.productModel
      .findById(addToCartDto.product)
      .populate('variants.color', 'name hexValue')
      .populate('variants.size', 'name')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variant = (product.variants as any).find(
      (v: any) => v._id.toString() === addToCartDto.variant,
    );
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.stockStatus === ProductStatus.STOCKOUT) {
      throw new BadRequestException('Product variant is out of stock');
    }

    // Get or create cart
    let cart = await this.cartModel
      .findOne({
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    if (!cart) {
      // @ts-expect-error - Mongoose type inference mismatch for HydratedDocument, but runtime is correct
      cart = await this.createCart(userId);
    }

    // Additional narrowing for TypeScript (should never be null here)
    if (!cart) {
      throw new InternalServerErrorException('Failed to get or create cart');
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === addToCartDto.product &&
        item.variant.toString() === addToCartDto.variant,
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += addToCartDto.quantity;
    } else {
      cart.items.push({
        product: new Types.ObjectId(addToCartDto.product),
        variant: new Types.ObjectId(addToCartDto.variant),
        quantity: addToCartDto.quantity,
        isSelected: addToCartDto.isSelected || false,
        price: product.discountedPrice,
        color: variant.color.name,
        size: variant.size.name,
        frontImage: variant.frontImage,
        backImage: variant.backImage,
      });
    }

    await cart.save();
    return await this.getCart(userId);
  }

  async updateCartItem(
    userId: string,
    productId: string,
    variantId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.variant.toString() === variantId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Cart item not found');
    }

    if (updateCartItemDto.quantity !== undefined) {
      cart.items[itemIndex].quantity = updateCartItemDto.quantity;
    }

    if (updateCartItemDto.isSelected !== undefined) {
      cart.items[itemIndex].isSelected = updateCartItemDto.isSelected;
    }

    await cart.save();
    return await this.getCart(userId);
  }

  async removeFromCart(
    userId: string,
    removeFromCartDto: RemoveFromCartDto,
  ): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === removeFromCartDto.product &&
          item.variant.toString() === removeFromCartDto.variant
        ),
    );

    await cart.save();
    return await this.getCart(userId);
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = [];
    await cart.save();
    return cart;
  }

  async checkout(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    cart.isActive = false;
    await cart.save();

    return cart;
  }

  async getCartCount(userId: string): Promise<number> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!cart) {
      return 0;
    }

    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }
}
