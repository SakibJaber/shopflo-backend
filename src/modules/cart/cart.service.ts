import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model, Types } from 'mongoose';
import { Cart, CartDocument, CartItem } from './schema/cart.schema';
import { Product, ProductDocument } from '../products/schema/product.schema';
import { Design, DesignDocument } from '../designs/schema/design.schema';
import {
  AddRegularProductToCartDto,
  AddDesignToCartDto,
} from './dto/create-cart.dto';
import { ProductStatus } from 'src/common/enum/product.status.enum';
import { Size, SizeDocument } from '../sizes/schema/size.schema';
import { UpdateCartItemDto } from 'src/modules/cart/dto/update-cart.dto';

// Interface for populated cart items
interface PopulatedCartItem extends Omit<CartItem, 'product' | 'design'> {
  _id: Types.ObjectId;
  product: any;
  design?: any;
}

// Interface for cart with populated items
interface PopulatedCart extends Omit<Cart, 'items'> {
  items: PopulatedCartItem[];
}

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

    // Filter out items with null products or no variantQuantities
    cart.items = cart.items.filter(
      (item: any) =>
        item.product && // Check that product exists
        item.variantQuantities &&
        Array.isArray(item.variantQuantities) &&
        item.variantQuantities.length > 0,
    );

    // Save the cleaned cart if modified
    if (cart.isModified()) {
      await cart.save();
    }

    let itemsTotal = 0;
    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item: PopulatedCartItem) => {
        const product = item.product as any;
        const design = item.design as any;

        // Add null check for product variants
        if (!product || !product.variants) {
          this.logger.warn(`Product or variants missing for item ${item._id}`);
          return null;
        }

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
                const sizeTotal = this.formatCurrency(
                  product.discountedPrice * sq.quantity,
                );

                return {
                  size: sq.size,
                  sizeName: sizeDoc?.name || 'Unknown',
                  quantity: sq.quantity,
                  sizeTotal: sizeTotal,
                };
              }),
            );

            const variantTotal = this.formatCurrency(
              sizeQuantitiesWithNames.reduce(
                (sum: number, sq) => sum + sq.sizeTotal,
                0,
              ),
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
        const itemTotal = this.formatCurrency(
          validVariants.reduce(
            (sum: number, variant: any) => sum + variant.variantTotal,
            0,
          ),
        );
        itemsTotal += itemTotal;

        return {
          _id: item._id,
          product: {
            _id: product._id,
            productName: product.productName,
            brand: product.brand,
            price: this.formatCurrency(product.price),
            discountedPrice: this.formatCurrency(product.discountedPrice),
            thumbnail: product.thumbnail,
          },
          design: design
            ? {
                _id: design._id,
                designName: design.designName,
              }
            : null,
          variants: validVariants,
          price: this.formatCurrency(product.discountedPrice),
          total: itemTotal,
          isSelected: item.isSelected,
          isDesignItem: item.isDesignItem,
        };
      }),
    );

    // Filter out null items
    const validItems = itemsWithDetails.filter(Boolean);

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
      items: validItems,
      summary: {
        itemsTotal: this.formatCurrency(itemsTotal),
        totalAmount: this.formatCurrency(itemsTotal),
        itemCount: validItems.length,
        variantCount,
        totalQuantity,
      },
    };
  }

  async addRegularProductToCart(
    userId: string,
    dto: AddRegularProductToCartDto,
  ): Promise<any> {
    try {
      // Step 1: Find and validate product
      const product = await this.productModel
        .findById(dto.product)
        .populate({
          path: 'variants.color',
          select: 'name hexValue',
        })
        .populate({
          path: 'variants.size',
          select: 'name',
        })
        .exec();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.variants || product.variants.length === 0) {
        throw new BadRequestException('Product has no variants');
      }

      // Step 2: Validate all variants and sizes
      const validatedVariants = await Promise.all(
        dto.variantQuantities.map(async (vq) => {
          const variant = (product.variants as any[]).find(
            (v: any) => v._id.toString() === vq.variant,
          );

          if (!variant) {
            throw new NotFoundException(`Variant ${vq.variant} not found`);
          }

          if (variant.stockStatus === ProductStatus.STOCKOUT) {
            throw new BadRequestException(
              `Variant ${variant.color?.name || vq.variant} is out of stock`,
            );
          }

          // Validate sizes
          const validSizeQuantities = vq.sizeQuantities.filter(
            (sq) => sq.quantity > 0,
          );

          if (validSizeQuantities.length === 0) {
            throw new BadRequestException(
              `At least one size with quantity > 0 is required for variant ${variant.color?.name || vq.variant}`,
            );
          }

          // Check if sizes are available for this variant
          const availableSizeIds = (variant.size || []).map((s: any) =>
            s._id ? s._id.toString() : s.toString(),
          );

          for (const sq of validSizeQuantities) {
            if (!availableSizeIds.includes(sq.size)) {
              const sizeDoc = await this.sizeModel.findById(sq.size);
              throw new BadRequestException(
                `Size ${sizeDoc?.name || sq.size} not available for variant ${variant.color?.name || vq.variant}`,
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
        throw new BadRequestException('No valid variants provided');
      }

      // Step 3: Get or create cart
      const cart = await this.getOrCreateCart(userId);

      // Step 4: Find existing regular product item (without design)
      const existingItemIndex = cart.items.findIndex(
        (item: any) => item.product.toString() === dto.product && !item.design,
      );

      if (existingItemIndex > -1) {
        // Merge with existing item
        await this.mergeVariantQuantities(
          cart.items[existingItemIndex],
          validatedVariants,
        );
        cart.items[existingItemIndex].isSelected = dto.isSelected ?? false;
        // console.log('where is the error man===============>');
      } else {
        // Create new cart item
        const newItem = {
          _id: new Types.ObjectId(),
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
        // console.log(
        //   'validatedVariants=============>',
        //   dto.variantQuantities,
        //   product.variants,
        // );

        cart.items.push(newItem as any);
      }
      // Step 5: Save and return
      await cart.save();
      return await this.getCartWithDetails(userId);
    } catch (error) {
      this.logger.error(
        `Error adding regular product to cart: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== ADD DESIGN TO CART ====================

  async addDesignToCart(userId: string, dto: AddDesignToCartDto): Promise<any> {
    try {
      // Step 1: Find and validate design
      const design = await this.designModel
        .findOne({
          _id: new Types.ObjectId(dto.design),
          user: new Types.ObjectId(userId),
          isActive: true,
        })
        .populate({
          path: 'baseProduct',
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

      if (!design) {
        throw new NotFoundException('Design not found or access denied');
      }

      const baseProduct = (design as any).baseProduct;
      if (!baseProduct) {
        throw new NotFoundException('Base product not found for this design');
      }

      if (!baseProduct.variants || baseProduct.variants.length === 0) {
        throw new BadRequestException('Base product has no variants');
      }

      // Step 2: Validate all variants and sizes
      const validatedVariants = await Promise.all(
        dto.variantQuantities.map(async (vq) => {
          const variant = (baseProduct.variants as any[]).find(
            (v: any) => v._id.toString() === vq.variant,
          );

          if (!variant) {
            throw new NotFoundException(
              `Variant ${vq.variant} not found in base product`,
            );
          }

          if (variant.stockStatus === ProductStatus.STOCKOUT) {
            throw new BadRequestException(
              `Variant ${variant.color?.name || vq.variant} is out of stock`,
            );
          }

          // Validate sizes
          const validSizeQuantities = vq.sizeQuantities.filter(
            (sq) => sq.quantity > 0,
          );

          if (validSizeQuantities.length === 0) {
            throw new BadRequestException(
              `At least one size with quantity > 0 is required for variant ${variant.color?.name || vq.variant}`,
            );
          }

          // Check if sizes are available for this variant
          const availableSizeIds = (variant.size || []).map((s: any) =>
            s._id ? s._id.toString() : s.toString(),
          );

          for (const sq of validSizeQuantities) {
            if (!availableSizeIds.includes(sq.size)) {
              const sizeDoc = await this.sizeModel.findById(sq.size);
              throw new BadRequestException(
                `Size ${sizeDoc?.name || sq.size} not available for variant ${variant.color?.name || vq.variant}`,
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
        throw new BadRequestException('No valid variants provided');
      }

      // Step 3: Get or create cart
      const cart = await this.getOrCreateCart(userId);

      // Step 4: Find existing design item
      const existingItemIndex = cart.items.findIndex(
        (item: any) => item.design && item.design.toString() === dto.design,
      );

      if (existingItemIndex > -1) {
        // Merge with existing design item
        await this.mergeVariantQuantities(
          cart.items[existingItemIndex],
          validatedVariants,
        );
        cart.items[existingItemIndex].isSelected = dto.isSelected ?? false;
      } else {
        // Create new design item
        const newItem = {
          _id: new Types.ObjectId(),
          product: new Types.ObjectId(baseProduct._id),
          design: new Types.ObjectId(dto.design),
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
          price: baseProduct.discountedPrice,
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

      // Step 5: Save and return
      await cart.save();
      return await this.getCartWithDetails(userId);
    } catch (error) {
      this.logger.error(`Error adding design to cart: ${error.message}`);
      throw error;
    }
  }

  // ==================== GET ITEM DETAILS ====================

  async getItemDetails(userId: string, itemId: string): Promise<any> {
    const cart = await this.getCart(userId);

    const item = cart.items.find((item: any) => item._id.toString() === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

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
            const sizeTotal = this.formatCurrency(
              product.discountedPrice * sq.quantity,
            );

            return {
              size: sq.size,
              sizeName: sizeDoc?.name || 'Unknown',
              quantity: sq.quantity,
              price: this.formatCurrency(product.discountedPrice),
              sizeTotal: sizeTotal,
            };
          }),
        );

        const variantTotal = this.formatCurrency(
          sizeQuantitiesWithNames.reduce(
            (sum: number, sq) => sum + sq.sizeTotal,
            0,
          ),
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
    const itemTotal = this.formatCurrency(
      validVariants.reduce(
        (sum: number, variant: any) => sum + variant.variantTotal,
        0,
      ),
    );

    // Calculate total quantity for this item
    const totalQuantity = item.variantQuantities.reduce(
      (total: number, vq: any) => {
        return (
          total +
          vq.sizeQuantities.reduce((sizeTotal: number, sq: any) => {
            return sizeTotal + sq.quantity;
          }, 0)
        );
      },
      0,
    );

    return {
      _id: item._id,
      product: {
        _id: product._id,
        productName: product.productName,
        brand: product.brand,
        price: this.formatCurrency(product.price),
        discountedPrice: this.formatCurrency(product.discountedPrice),
        thumbnail: product.thumbnail,
      },
      design: design
        ? {
            _id: design._id,
            designName: design.designName,
          }
        : null,
      variants: validVariants,
      price: this.formatCurrency(product.discountedPrice),
      total: itemTotal,
      totalQuantity,
      isSelected: item.isSelected,
      isDesignItem: item.isDesignItem,
    };
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
      // Get product to validate new variants
      const product = await this.productModel
        .findById(item.product)
        .populate('variants.color', 'name hexValue')
        .populate('variants.size', 'name _id')
        .exec();

      if (!product) throw new NotFoundException('Product not found');

      for (const updatedVariant of dto.variantQuantities) {
        const existingVariantIndex = item.variantQuantities.findIndex(
          (vq: any) => vq.variant.toString() === updatedVariant.variant,
        );

        if (existingVariantIndex > -1) {
          // Handle empty sizeQuantities array - remove the entire variant
          if (updatedVariant.sizeQuantities.length === 0) {
            // Remove the entire variant
            item.variantQuantities.splice(existingVariantIndex, 1);
            continue;
          }

          // Update existing variant - only update provided sizes, keep others unchanged
          const existingVariant = item.variantQuantities[existingVariantIndex];

          // Create a map of existing size quantities for easy lookup
          const existingSizeMap = new Map();
          existingVariant.sizeQuantities.forEach((sq: any) => {
            existingSizeMap.set(sq.size.toString(), sq);
          });

          // Update only the sizes provided in the request
          for (const updatedSize of updatedVariant.sizeQuantities) {
            if (updatedSize.quantity > 0) {
              // Update existing size or add new size to this variant
              existingSizeMap.set(updatedSize.size, {
                size: new Types.ObjectId(updatedSize.size),
                quantity: updatedSize.quantity,
              });
            } else {
              // Remove size if quantity is 0 or negative
              existingSizeMap.delete(updatedSize.size);
            }
          }

          // Convert back to array
          existingVariant.sizeQuantities = Array.from(existingSizeMap.values());
        } else {
          // Skip if trying to add a variant with empty sizeQuantities
          if (updatedVariant.sizeQuantities.length === 0) {
            continue;
          }

          // Validate new variant before adding
          const newVariant = (product.variants as any).find(
            (v: any) => v._id.toString() === updatedVariant.variant,
          );

          if (!newVariant) {
            throw new NotFoundException(
              `Variant ${updatedVariant.variant} not found in product`,
            );
          }

          if (newVariant.stockStatus === ProductStatus.STOCKOUT) {
            throw new BadRequestException(
              `Variant ${newVariant.color.name} is out of stock`,
            );
          }

          // Validate sizes for new variant
          const validSizeQuantities = updatedVariant.sizeQuantities.filter(
            (sq) => sq.quantity > 0,
          );

          if (validSizeQuantities.length === 0) {
            throw new BadRequestException(
              `At least one size with quantity > 0 is required for new variant ${newVariant.color.name}`,
            );
          }

          const availableSizeIds = newVariant.size.map((s: any) =>
            s._id.toString(),
          );
          for (const sq of validSizeQuantities) {
            if (!availableSizeIds.includes(sq.size)) {
              const sizeDoc = await this.sizeModel.findById(sq.size);
              throw new BadRequestException(
                `Size ${sizeDoc?.name || sq.size} not available for variant ${newVariant.color.name}`,
              );
            }
          }

          // Add new variant after validation
          item.variantQuantities.push({
            variant: new Types.ObjectId(updatedVariant.variant),
            sizeQuantities: validSizeQuantities.map((sq) => ({
              size: new Types.ObjectId(sq.size),
              quantity: sq.quantity,
            })),
          });
        }
      }

      // Remove variants with no size quantities
      item.variantQuantities = item.variantQuantities.filter(
        (vq: any) => vq.sizeQuantities && vq.sizeQuantities.length > 0,
      );

      // Remove entire item if no variants left
      if (item.variantQuantities.length === 0) {
        cart.items.splice(itemIndex, 1);
      }
    }

    // Update selection status if provided
    if (dto.isSelected !== undefined) {
      item.isSelected = dto.isSelected;
    }

    cart.markModified('items');
    await cart.save();
    return await this.getCartWithDetails(userId);
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

  private formatCurrency(amount: number): number {
    return parseFloat(amount.toFixed(2));
  }

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

  private async getCart(userId: string): Promise<any> {
    let cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId), isActive: true })
      .exec(); // ⬅ remove `.lean()`

    if (!cart) {
      return await this.createCart(userId);
    }

    // Manually populate products for each item
    const populatedItems = await Promise.all(
      cart.items.map(async (item: any) => {
        const product = await this.productModel
          .findById(item.product)
          .populate({
            path: 'variants.color',
            select: 'name hexValue',
          })
          .populate({
            path: 'variants.size',
            select: 'name',
          })
          .exec();

        let design: DesignDocument | null = null;
        if (item.design) {
          design = await this.designModel
            .findById(item.design)
            .populate({
              path: 'baseProduct',
              populate: [
                { path: 'variants.color', select: 'name hexValue' },
                { path: 'variants.size', select: 'name' },
              ],
            })
            .exec();
        }

        return {
          ...item.toObject(), // convert subdoc to plain
          product,
          design,
        };
      }),
    );

    cart.items = populatedItems;
    return cart;
  }

  private async getOrCreateCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });
    return cart || this.createCart(userId);
  }
}
