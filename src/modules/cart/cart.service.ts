import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
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
import { Size, SizeDocument } from '../sizes/schema/size.schema';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Size.name)
    private readonly sizeModel: Model<SizeDocument>,
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
      this.logger.error(
        `Failed to create cart for user ${userId}: ${error.message}`,
        error.stack,
      );

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
      .populate({
        path: 'items.sizeQuantities.size',
        select: 'name',
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
    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item) => {
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
        const itemTotal = item.sizeQuantities.reduce(
          (sum, sq) => sum + itemPrice * sq.quantity,
          0,
        );
        itemsTotal += itemTotal;

        // Get size names for each sizeQuantity
        const sizeQuantitiesWithNames = await Promise.all(
          item.sizeQuantities.map(async (sq) => {
            const sizeDoc = await this.sizeModel.findById(sq.size);
            return {
              size: sq.size,
              sizeName: sizeDoc?.name || 'Unknown',
              quantity: sq.quantity,
            };
          }),
        );

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
            sizes: variant.size, // array of available sizes
            frontImage: variant.frontImage,
            backImage: variant.backImage,
          },
          sizeQuantities: sizeQuantitiesWithNames,
          price: itemPrice,
          total: itemTotal,
        };
      }),
    );

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
      .populate('variants.size', 'name _id')
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

    // Filter out zero quantities and validate sizes are available in variant
    const sizeQuantities = addToCartDto.sizeQuantities.filter(
      (sq) => sq.quantity > 0,
    );

    // Get available size IDs from variant
    const availableSizeIds = variant.size.map((s: any) => s._id.toString());

    for (const sq of sizeQuantities) {
      if (!availableSizeIds.includes(sq.size)) {
        const sizeDoc = await this.sizeModel.findById(sq.size);
        throw new BadRequestException(
          `Size ${sizeDoc?.name || sq.size} not available for this variant`,
        );
      }
    }

    // Get or create cart
    let cart = await this.cartModel
      .findOne({
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    if (!cart) {
      await this.createCart(userId);
      cart = await this.cartModel
        .findOne({
          user: new Types.ObjectId(userId),
          isActive: true,
        })
        .exec();
    }

    if (!cart) {
      throw new InternalServerErrorException('Failed to get or create cart');
    }

    // Find existing item by product and variant
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === addToCartDto.product &&
        item.variant.toString() === addToCartDto.variant,
    );

    if (existingItemIndex > -1) {
      // Merge sizeQuantities
      const existingSizes = cart.items[existingItemIndex].sizeQuantities;
      const sizeMap = new Map(
        existingSizes.map((sq) => [sq.size.toString(), sq.quantity]),
      );

      for (const sq of sizeQuantities) {
        const currentQty = sizeMap.get(sq.size) || 0;
        sizeMap.set(sq.size, currentQty + sq.quantity);
      }

      cart.items[existingItemIndex].sizeQuantities = Array.from(
        sizeMap.entries(),
      ).map(([size, quantity]) => ({
        size: new Types.ObjectId(size),
        quantity,
      }));

      if (addToCartDto.isSelected !== undefined) {
        cart.items[existingItemIndex].isSelected = addToCartDto.isSelected;
      }
    } else {
      // Add new item
      cart.items.push({
        product: new Types.ObjectId(addToCartDto.product),
        variant: new Types.ObjectId(addToCartDto.variant),
        sizeQuantities: sizeQuantities.map((sq) => ({
          size: new Types.ObjectId(sq.size),
          quantity: sq.quantity,
        })),
        isSelected: addToCartDto.isSelected || false,
        price: product.discountedPrice,
        color: variant.color.name,
        frontImage: variant.frontImage,
        backImage: variant.backImage,
      } as any);
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

    const item = cart.items[itemIndex];

    // Validate size if provided
    if (updateCartItemDto.size) {
      const product = await this.productModel
        .findById(productId)
        .populate('variants.size', '_id')
        .exec();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const variant = (product.variants as any).find(
        (v: any) => v._id.toString() === variantId,
      );

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      const availableSizeIds = variant.size.map((s: any) => s._id.toString());
      if (!availableSizeIds.includes(updateCartItemDto.size)) {
        const sizeDoc = await this.sizeModel.findById(updateCartItemDto.size);
        throw new BadRequestException(
          `Size ${sizeDoc?.name || updateCartItemDto.size} not available for this variant`,
        );
      }
    }

    if (updateCartItemDto.sizeQuantities) {
      // Validate all sizes
      const product = await this.productModel
        .findById(productId)
        .populate('variants.size', '_id')
        .exec();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const variant = (product.variants as any).find(
        (v: any) => v._id.toString() === variantId,
      );

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      const availableSizeIds = variant.size.map((s: any) => s._id.toString());

      for (const sq of updateCartItemDto.sizeQuantities) {
        if (!availableSizeIds.includes(sq.size)) {
          const sizeDoc = await this.sizeModel.findById(sq.size);
          throw new BadRequestException(
            `Size ${sizeDoc?.name || sq.size} not available for this variant`,
          );
        }
      }

      // Replace all size quantities
      item.sizeQuantities = updateCartItemDto.sizeQuantities
        .filter((sq) => sq.quantity > 0)
        .map((sq) => ({
          size: new Types.ObjectId(sq.size),
          quantity: sq.quantity,
        }));
    } else if (
      updateCartItemDto.size &&
      updateCartItemDto.quantity !== undefined
    ) {
      // Update specific size
      const sqIndex = item.sizeQuantities.findIndex(
        (sq) => sq.size.toString() === updateCartItemDto.size,
      );

      if (sqIndex > -1) {
        if (updateCartItemDto.quantity <= 0) {
          item.sizeQuantities.splice(sqIndex, 1);
        } else {
          item.sizeQuantities[sqIndex].quantity = updateCartItemDto.quantity;
        }
      } else if (updateCartItemDto.quantity > 0) {
        item.sizeQuantities.push({
          size: new Types.ObjectId(updateCartItemDto.size),
          quantity: updateCartItemDto.quantity,
        });
      }
    }

    if (updateCartItemDto.isSelected !== undefined) {
      item.isSelected = updateCartItemDto.isSelected;
    }

    // Remove item if no sizes left
    if (item.sizeQuantities.length === 0) {
      cart.items.splice(itemIndex, 1);
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

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === removeFromCartDto.product &&
        item.variant.toString() === removeFromCartDto.variant,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Cart item not found');
    }

    if (removeFromCartDto.size) {
      // Remove specific size
      cart.items[itemIndex].sizeQuantities = cart.items[
        itemIndex
      ].sizeQuantities.filter(
        (sq) => sq.size.toString() !== removeFromCartDto.size,
      );
      if (cart.items[itemIndex].sizeQuantities.length === 0) {
        cart.items.splice(itemIndex, 1);
      }
    } else {
      // Remove entire item
      cart.items.splice(itemIndex, 1);
    }

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

    // Validate stock availability before checkout
    for (const item of cart.items) {
      const product = await this.productModel
        .findById(item.product)
        .populate('variants.size', '_id')
        .exec();

      if (!product) {
        throw new NotFoundException(`Product ${item.product} not found`);
      }

      const variant = (product.variants as any).find(
        (v: any) => v._id.toString() === item.variant.toString(),
      );

      if (!variant) {
        throw new NotFoundException(`Variant ${item.variant} not found`);
      }

      if (variant.stockStatus === ProductStatus.STOCKOUT) {
        throw new BadRequestException(
          `Product variant ${variant._id} is out of stock`,
        );
      }

      // Check if all sizes are still available
      const availableSizeIds = variant.size.map((s: any) => s._id.toString());
      for (const sq of item.sizeQuantities) {
        if (!availableSizeIds.includes(sq.size.toString())) {
          const sizeDoc = await this.sizeModel.findById(sq.size);
          throw new BadRequestException(
            `Size ${sizeDoc?.name || sq.size} is no longer available for this variant`,
          );
        }
      }
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

    return cart.items.reduce(
      (total, item) =>
        total + item.sizeQuantities.reduce((sum, sq) => sum + sq.quantity, 0),
      0,
    );
  }
}
