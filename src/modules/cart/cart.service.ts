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
import { Design, DesignDocument } from '../designs/schema/design.schema';
import {
  AddRegularProductToCartDto,
  UpdateCartItemDto,
  AddDesignToCartDto,
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
    @InjectModel(Design.name)
    private readonly designModel: Model<DesignDocument>,
    @InjectModel(Size.name) private readonly sizeModel: Model<SizeDocument>,
  ) {}
  // -------------------- helpers --------------------

  /** Normalize a value that might be a populated doc, ObjectId, or string to an ObjectId string */
  private asObjectIdString(val: any, fieldLabel: string): string {
    const maybe =
      typeof val === 'string'
        ? val
        : (val?._id?.toString?.() ?? val?.toString?.());

    if (!maybe || !Types.ObjectId.isValid(maybe)) {
      throw new BadRequestException(`${fieldLabel} is missing or invalid`);
    }
    return maybe;
  }

  private idsEqual(a: any, b: any): boolean {
    try {
      return (
        this.asObjectIdString(a, 'left') === this.asObjectIdString(b, 'right')
      );
    } catch {
      return false;
    }
  }

  // ==================== CART MANAGEMENT ====================

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
          throw new InternalServerErrorException(
            'Cart duplication error but no cart found',
          );
        }
        return existingCart;
      }
      throw new InternalServerErrorException('Failed to create cart');
    }
  }

  async getCartWithDetails(userId: string) {
    const cart = await this.getCart(userId);

    // Filter out old items that don't have variantQuantities or have empty variantQuantities
    cart.items = cart.items.filter(
      (item: any) =>
        item.variantQuantities &&
        Array.isArray(item.variantQuantities) &&
        item.variantQuantities.length > 0,
    );

    // Save the cleaned cart
    if (cart.isModified()) {
      await cart.save();
    }

    let itemsTotal = 0;
    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item: any) => {
        const product = item.product as any;
        const design = item.design as any;

        // Process each variant in the item
        const variantsWithDetails = await Promise.all(
          item.variantQuantities.map(async (vq: any) => {
            const variant = product.variants.find(
              (v: any) => v._id.toString() === vq.variant.toString(),
            );

            if (!variant) {
              this.logger.warn(
                `Variant ${vq.variant} not found in product ${product._id}`,
              );
              return null;
            }

            // Get size details for this variant
            const sizeQuantitiesWithNames = await Promise.all(
              vq.sizeQuantities.map(async (sq: any) => {
                const sizeDoc = await this.sizeModel.findById(sq.size);
                return {
                  size: sq.size,
                  sizeName: sizeDoc?.name || 'Unknown',
                  quantity: sq.quantity,
                };
              }),
            );

            const variantTotal = sizeQuantitiesWithNames.reduce(
              (sum: number, sq) => sum + product.discountedPrice * sq.quantity,
              0,
            );

            // Use design images if available, otherwise variant images
            const displayImages = design
              ? {
                  frontImage: design.frontImage || variant.frontImage,
                  backImage: design.backImage || variant.backImage,
                  leftImage: design.leftImage || variant.leftImage,
                  rightImage: design.rightImage || variant.rightImage,
                }
              : {
                  frontImage: variant.frontImage,
                  backImage: variant.backImage,
                  leftImage: variant.leftImage,
                  rightImage: variant.rightImage,
                };

            return {
              variantId: variant._id,
              color: variant.color,
              sizeQuantities: sizeQuantitiesWithNames,
              displayImages,
              variantTotal,
            };
          }),
        );

        // Filter out null variants and calculate item total
        const validVariants = variantsWithDetails.filter(Boolean);
        const itemTotal = validVariants.reduce(
          (sum: number, variant: any) => sum + variant.variantTotal,
          0,
        );
        itemsTotal += itemTotal;

        return {
          _id: item._id,
          product: {
            _id: product._id,
            productName: product.productName,
            brand: product.brand,
            price: product.price,
            discountedPrice: product.discountedPrice,
            thumbnail: product.thumbnail,
          },
          design: design
            ? {
                _id: design._id,
                designName: design.designName,
              }
            : null,
          variants: validVariants,
          price: product.discountedPrice,
          total: itemTotal,
          isSelected: item.isSelected,
          isDesignItem: item.isDesignItem,
        };
      }),
    );

    // Calculate total quantities
    const totalQuantity = cart.items.reduce((total: number, item: any) => {
      return (
        total +
        item.variantQuantities.reduce((itemTotal: number, vq: any) => {
          return (
            itemTotal +
            vq.sizeQuantities.reduce((sizeTotal: number, sq: any) => {
              return sizeTotal + sq.quantity;
            }, 0)
          );
        }, 0)
      );
    }, 0);

    // Calculate variant count
    const variantCount = cart.items.reduce(
      (count: number, item: any) =>
        count + (item.variantQuantities?.length || 0),
      0,
    );

    return {
      items: itemsWithDetails,
      summary: {
        itemsTotal,
        totalAmount: itemsTotal,
        itemCount: cart.items.length,
        variantCount,
        totalQuantity,
      },
    };
  }

  // ==================== ADD REGULAR PRODUCT ====================

  async addRegularProductToCart(
    userId: string,
    dto: AddRegularProductToCartDto,
  ): Promise<any> {
    const product = await this.productModel
      .findById(dto.product)
      .populate('variants.color', 'name hexValue')
      .populate('variants.size', 'name _id')
      .exec();

    if (!product) throw new NotFoundException('Product not found');

    // Validate all variants and their sizes
    const validatedVariants = await Promise.all(
      dto.variantQuantities.map(async (vq) => {
        const variant = (product.variants as any).find(
          (v: any) => v._id.toString() === vq.variant,
        );

        if (!variant) {
          throw new NotFoundException(`Variant ${vq.variant} not found`);
        }

        if (variant.stockStatus === ProductStatus.STOCKOUT) {
          throw new BadRequestException(
            `Variant ${variant.color.name} is out of stock`,
          );
        }

        // Validate sizes for this variant
        const validSizeQuantities = vq.sizeQuantities.filter(
          (sq) => sq.quantity > 0,
        );

        if (validSizeQuantities.length === 0) {
          throw new BadRequestException(
            `At least one size with quantity > 0 is required for variant ${variant.color.name}`,
          );
        }

        const availableSizeIds = variant.size.map((s: any) => s._id.toString());
        for (const sq of validSizeQuantities) {
          if (!availableSizeIds.includes(sq.size)) {
            const sizeDoc = await this.sizeModel.findById(sq.size);
            throw new BadRequestException(
              `Size ${sizeDoc?.name || sq.size} not available for variant ${variant.color.name}`,
            );
          }
        }

        return {
          variant,
          sizeQuantities: validSizeQuantities,
        };
      }),
    );

    if (validatedVariants.length === 0) {
      throw new BadRequestException(
        'At least one variant with quantities is required',
      );
    }

    const cart = await this.getOrCreateCart(userId);

    // Find existing item for this product (without design)
    const existingItemIndex = cart.items.findIndex(
      (item: any) => item.product.toString() === dto.product && !item.design,
    );

    if (existingItemIndex > -1) {
      // Merge variant quantities into existing item
      await this.mergeVariantQuantities(
        cart.items[existingItemIndex],
        validatedVariants,
      );
      cart.items[existingItemIndex].isSelected = dto.isSelected ?? false;
    } else {
      // Create new cart item with multiple variants
      const newItem = {
        product: new Types.ObjectId(dto.product),
        variantQuantities: validatedVariants.map(
          ({ variant, sizeQuantities }) => ({
            variant: new Types.ObjectId(variant._id),
            sizeQuantities: sizeQuantities.map((sq) => ({
              size: new Types.ObjectId(sq.size),
              quantity: sq.quantity,
            })),
          }),
        ),
        isSelected: dto.isSelected ?? false,
        price: product.discountedPrice,
        isDesignItem: false,
      };

      cart.items.push(newItem as any);
    }

    await cart.save();
    return await this.getCartWithDetails(userId);
  }

  // ==================== ADD DESIGN PRODUCT ====================

  // async addDesignToCart(userId: string, dto: AddDesignToCartDto): Promise<any> {
  //   const design = await this.designModel
  //     .findOne({
  //       _id: new Types.ObjectId(dto.design),
  //       user: new Types.ObjectId(userId),
  //       isActive: true,
  //     })
  //     .populate('baseProduct')
  //     // .populate('color')
  //     .exec();

  //   if (!design) {
  //     throw new NotFoundException('Design not found or access denied');
  //   }

  //   const baseProductId = this.asObjectIdString(
  //     (design as any).baseProduct,
  //     'Design base product',
  //   );

  //   const product = await this.productModel
  //     .findById(baseProductId)
  //     .populate('variants.color', 'name hexValue')
  //     .populate('variants.size', 'name _id')
  //     .exec();

  //   if (!product) throw new NotFoundException('Base product not found');

  //   const variants: any[] = Array.isArray((product as any).variants)
  //     ? (product as any).variants
  //     : [];

  //   // Validate all design variants
  //   const validatedVariants = await Promise.all(
  //     dto.variantQuantities.map(async (vq) => {
  //       const variant = variants.find((v: any) =>
  //         this.idsEqual(v._id, vq.variant),
  //       );

  //       if (!variant) {
  //         throw new NotFoundException(
  //           `Variant ${vq.variant} not found in base product`,
  //         );
  //       }

  //       if (variant.stockStatus === ProductStatus.STOCKOUT) {
  //         throw new BadRequestException(
  //           `Variant ${variant.color.name} is out of stock`,
  //         );
  //       }

  //       // Validate sizes
  //       const validSizeQuantities = vq.sizeQuantities.filter(
  //         (sq) => sq.quantity > 0,
  //       );

  //       if (validSizeQuantities.length === 0) {
  //         throw new BadRequestException(
  //           `At least one size with quantity > 0 is required for variant ${variant.color.name}`,
  //         );
  //       }

  //       const availableSizeIds = variant.size.map((s: any) =>
  //         this.asObjectIdString(s, 'Variant size'),
  //       );

  //       for (const sq of validSizeQuantities) {
  //         const sizeId = this.asObjectIdString(sq.size, 'Size');
  //         if (!availableSizeIds.includes(sizeId)) {
  //           const sizeDoc = await this.sizeModel.findById(sq.size);
  //           throw new BadRequestException(
  //             `Size ${sizeDoc?.name || sq.size} not available for variant ${variant.color.name}`,
  //           );
  //         }
  //       }

  //       return {
  //         variant,
  //         sizeQuantities: validSizeQuantities,
  //       };
  //     }),
  //   );

  //   if (validatedVariants.length === 0) {
  //     throw new BadRequestException(
  //       'At least one variant with quantities is required',
  //     );
  //   }

  //   const cart = await this.getOrCreateCart(userId);

  //   // Find existing design item
  //   const existingItemIndex = cart.items.findIndex((item: any) =>
  //     this.idsEqual(item.design, dto.design),
  //   );

  //   if (existingItemIndex > -1) {
  //     // Merge variant quantities
  //     await this.mergeVariantQuantities(
  //       cart.items[existingItemIndex],
  //       validatedVariants,
  //     );
  //     cart.items[existingItemIndex].isSelected = dto.isSelected ?? false;
  //   } else {
  //     // Create new design item with multiple variants
  //     const newItem = {
  //       product: new Types.ObjectId(baseProductId),
  //       design: new Types.ObjectId(this.asObjectIdString(dto.design, 'Design')),
  //       variantQuantities: validatedVariants.map(
  //         ({ variant, sizeQuantities }) => ({
  //           variant: new Types.ObjectId(
  //             this.asObjectIdString(variant._id, 'Variant'),
  //           ),
  //           sizeQuantities: sizeQuantities.map((sq) => ({
  //             size: new Types.ObjectId(this.asObjectIdString(sq.size, 'Size')),
  //             quantity: sq.quantity,
  //           })),
  //         }),
  //       ),
  //       isSelected: dto.isSelected ?? false,
  //       price: product.discountedPrice,
  //       designData: {
  //         designName: (design as any).designName,
  //         frontImage: (design as any).frontImage,
  //         backImage: (design as any).backImage,
  //         leftImage: (design as any).leftImage,
  //         rightImage: (design as any).rightImage,
  //       },
  //       isDesignItem: true,
  //     };

  //     cart.items.push(newItem as any);
  //   }

  //   await cart.save();
  //   return await this.getCartWithDetails(userId);
  // }

  async addDesignToCart(userId: string, dto: AddDesignToCartDto): Promise<any> {
    const design = await this.designModel
      .findOne({
        _id: new Types.ObjectId(dto.design),
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .populate('baseProduct') // Only populate baseProduct, not color
      .exec();

    if (!design) {
      throw new NotFoundException('Design not found or access denied');
    }

    const baseProductId = this.asObjectIdString(
      (design as any).baseProduct,
      'Design base product',
    );

    const product = await this.productModel
      .findById(baseProductId)
      .populate('variants.color', 'name hexValue')
      .populate('variants.size', 'name _id')
      .exec();

    if (!product) throw new NotFoundException('Base product not found');

    const variants: any[] = Array.isArray((product as any).variants)
      ? (product as any).variants
      : [];

    // Validate all design variants
    const validatedVariants = await Promise.all(
      dto.variantQuantities.map(async (vq) => {
        const variant = variants.find((v: any) =>
          this.idsEqual(v._id, vq.variant),
        );

        if (!variant) {
          throw new NotFoundException(
            `Variant ${vq.variant} not found in base product`,
          );
        }

        if (variant.stockStatus === ProductStatus.STOCKOUT) {
          throw new BadRequestException(
            `Variant ${variant.color.name} is out of stock`,
          );
        }

        // Validate sizes
        const validSizeQuantities = vq.sizeQuantities.filter(
          (sq) => sq.quantity > 0,
        );

        if (validSizeQuantities.length === 0) {
          throw new BadRequestException(
            `At least one size with quantity > 0 is required for variant ${variant.color.name}`,
          );
        }

        const availableSizeIds = variant.size.map((s: any) =>
          this.asObjectIdString(s, 'Variant size'),
        );

        for (const sq of validSizeQuantities) {
          const sizeId = this.asObjectIdString(sq.size, 'Size');
          if (!availableSizeIds.includes(sizeId)) {
            const sizeDoc = await this.sizeModel.findById(sq.size);
            throw new BadRequestException(
              `Size ${sizeDoc?.name || sq.size} not available for variant ${variant.color.name}`,
            );
          }
        }

        return {
          variant,
          sizeQuantities: validSizeQuantities,
        };
      }),
    );

    if (validatedVariants.length === 0) {
      throw new BadRequestException(
        'At least one variant with quantities is required',
      );
    }

    const cart = await this.getOrCreateCart(userId);

    // Find existing design item
    const existingItemIndex = cart.items.findIndex((item: any) =>
      this.idsEqual(item.design, dto.design),
    );

    if (existingItemIndex > -1) {
      // Merge variant quantities
      await this.mergeVariantQuantities(
        cart.items[existingItemIndex],
        validatedVariants,
      );
      cart.items[existingItemIndex].isSelected = dto.isSelected ?? false;
    } else {
      // Create new design item with multiple variants
      const newItem = {
        product: new Types.ObjectId(baseProductId),
        design: new Types.ObjectId(this.asObjectIdString(dto.design, 'Design')),
        variantQuantities: validatedVariants.map(
          ({ variant, sizeQuantities }) => ({
            variant: new Types.ObjectId(
              this.asObjectIdString(variant._id, 'Variant'),
            ),
            sizeQuantities: sizeQuantities.map((sq) => ({
              size: new Types.ObjectId(this.asObjectIdString(sq.size, 'Size')),
              quantity: sq.quantity,
            })),
          }),
        ),
        isSelected: dto.isSelected ?? false,
        price: product.discountedPrice,
        designData: {
          designName: (design as any).designName,
          frontImage: (design as any).frontImage,
          backImage: (design as any).backImage,
          leftImage: (design as any).leftImage,
          rightImage: (design as any).rightImage,
        },
        isDesignItem: true,
      };

      cart.items.push(newItem as any);
    }

    await cart.save();
    return await this.getCartWithDetails(userId);
  }

  // ==================== UPDATE CART ITEM ====================

  async updateCartItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<any> {
    const cart = await this.getCart(userId);

    const itemIndex = cart.items.findIndex(
      (item: any) => item._id.toString() === itemId,
    );

    if (itemIndex === -1) throw new NotFoundException('Cart item not found');

    const item = cart.items[itemIndex];

    // Update variant quantities if provided
    if (dto.variantQuantities && dto.variantQuantities.length > 0) {
      // For simplicity, replace all variant quantities
      // You might want to add merge logic here similar to add methods
      item.variantQuantities = dto.variantQuantities.map((vq) => ({
        variant: new Types.ObjectId(vq.variant),
        sizeQuantities: vq.sizeQuantities
          .filter((sq) => sq.quantity > 0)
          .map((sq) => ({
            size: new Types.ObjectId(sq.size),
            quantity: sq.quantity,
          })),
      }));

      // Remove item if no variants with quantities
      if (item.variantQuantities.length === 0) {
        cart.items.splice(itemIndex, 1);
      }
    }

    // Update selection status if provided
    if (dto.isSelected !== undefined) {
      item.isSelected = dto.isSelected;
    }

    await cart.save();
    return await this.getCartWithDetails(userId);
  }

  // ==================== PRIVATE HELPERS ====================

  private async mergeVariantQuantities(
    item: any,
    newVariants: Array<{
      variant: any;
      sizeQuantities: Array<{ size: string; quantity: number }>;
    }>,
  ): Promise<void> {
    for (const newVariant of newVariants) {
      const existingVariantIndex = item.variantQuantities.findIndex(
        (vq: any) =>
          vq.variant.toString() === newVariant.variant._id.toString(),
      );

      if (existingVariantIndex > -1) {
        // Merge sizes for existing variant
        const existingVariant = item.variantQuantities[existingVariantIndex];
        const sizeMap = new Map<string, number>();

        // Add existing sizes
        existingVariant.sizeQuantities.forEach((sq: any) => {
          sizeMap.set(sq.size.toString(), sq.quantity);
        });

        // Merge new sizes
        for (const newSq of newVariant.sizeQuantities) {
          const currentQty = sizeMap.get(newSq.size) || 0;
          sizeMap.set(newSq.size, currentQty + newSq.quantity);
        }

        // Update size quantities
        existingVariant.sizeQuantities = Array.from(sizeMap.entries()).map(
          ([size, quantity]) => ({
            size: new Types.ObjectId(size),
            quantity,
          }),
        );
      } else {
        // Add new variant
        item.variantQuantities.push({
          variant: new Types.ObjectId(newVariant.variant._id),
          sizeQuantities: newVariant.sizeQuantities.map((sq) => ({
            size: new Types.ObjectId(sq.size),
            quantity: sq.quantity,
          })),
        });
      }
    }
  }

  // ==================== REMOVE CART ITEM ====================

  async removeCartItem(userId: string, itemId: string): Promise<any> {
    const cart = await this.getCart(userId);

    const itemIndex = cart.items.findIndex(
      (item: any) => item._id.toString() === itemId,
    );

    if (itemIndex === -1) throw new NotFoundException('Cart item not found');

    cart.items.splice(itemIndex, 1);
    await cart.save();

    return await this.getCartWithDetails(userId);
  }

  // ==================== CLEAR CART ====================

  async clearCart(userId: string): Promise<any> {
    const cart = await this.getCart(userId);
    cart.items = [];
    await cart.save();
    return await this.getCartWithDetails(userId);
  }

  // ==================== PRIVATE HELPERS ====================

  // private async getCart(userId: string): Promise<CartDocument> {
  //   const cart = await this.cartModel
  //     .findOne({ user: new Types.ObjectId(userId), isActive: true })
  //     .populate({
  //       path: 'items.product',
  //       select:
  //         'productName brand price discountPercentage discountedPrice variants thumbnail',
  //       populate: [
  //         { path: 'variants.color', select: 'name hexValue' },
  //         { path: 'variants.size', select: 'name' },
  //       ],
  //     })
  //     .populate({
  //       path: 'items.design',
  //       select: 'designName frontImage backImage leftImage rightImage ',
  //     })
  //     // .populate('items.color', 'name hexValue')
  //     .exec();

  //   if (!cart) return await this.createCart(userId);
  //   return cart;
  // }

  private async getCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId), isActive: true })
      .populate({
        path: 'items.product',
        select:
          'productName brand price discountPercentage discountedPrice variants thumbnail',
        populate: [
          {
            path: 'brand',
            select: 'brandName brandLogo',
          },
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
        path: 'items.design',
        select: 'designName frontImage backImage leftImage rightImage',
      })
      .exec();

    if (!cart) return await this.createCart(userId);
    return cart;
  }

  private async getOrCreateCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });
    return cart || this.createCart(userId);
  }

  private mergeSizeQuantities(
    item: any,
    newSizeQuantities: Array<{ size: string; quantity: number }>,
  ): void {
    const sizeMap = new Map<string, number>();

    // Initialize with existing quantities
    item.sizeQuantities.forEach((sq: any) => {
      sizeMap.set(sq.size.toString(), sq.quantity);
    });

    // Merge with new quantities
    for (const sq of newSizeQuantities) {
      const currentQty = sizeMap.get(sq.size) || 0;
      sizeMap.set(sq.size, currentQty + sq.quantity);
    }

    // Convert back to array format
    item.sizeQuantities = Array.from(sizeMap.entries()).map(
      ([size, quantity]) => ({
        size: new Types.ObjectId(size),
        quantity,
      }),
    );
  }
}
