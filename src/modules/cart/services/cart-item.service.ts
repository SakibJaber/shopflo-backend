import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../schema/cart.schema';
import { Product, ProductDocument } from '../../products/schema/product.schema';
import { Design, DesignDocument } from '../../designs/schema/design.schema';
import { Size, SizeDocument } from '../../sizes/schema/size.schema';
import {
  AddRegularProductToCartDto,
  AddDesignToCartDto,
} from '../dto/create-cart.dto';
import { ProductStatus } from 'src/common/enum/product.status.enum';
import { UpdateCartItemDto } from 'src/modules/cart/dto/update-cart.dto';
import { CartService } from './cart.service';

@Injectable()
export class CartItemService {
  private readonly logger = new Logger(CartItemService.name);

  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Design.name)
    private readonly designModel: Model<DesignDocument>,
    @InjectModel(Size.name) private readonly sizeModel: Model<SizeDocument>,
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
  ) {}

  // ==================== ADD REGULAR PRODUCT TO CART ====================

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

      // Step 3: Get or create Cart
      const cart = await this.cartService.getOrCreateCart(userId);

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

        cart.items.push(newItem as any);
      }
      // Step 5: Save and return
      await cart.save();
      return await this.cartService.getCartWithDetails(userId);
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
      const cart = await this.cartService.getOrCreateCart(userId);

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
      return await this.cartService.getCartWithDetails(userId);
    } catch (error) {
      this.logger.error(`Error adding design to cart: ${error.message}`);
      throw error;
    }
  }

  // ==================== UPDATE CART ITEM ====================

  async updateCartItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<any> {
    const cart = await this.cartService.getCart(userId);

    const itemIndex = cart.items.findIndex(
      (item: any) => item._id.toString() === itemId,
    );

    if (itemIndex === -1) throw new NotFoundException('Cart item not found');

    const item = cart.items[itemIndex];

    try {
      // If client provided variantQuantities (even an empty array), process updates/removals/adds.
      if (dto.variantQuantities !== undefined) {
        // Load product once for validation when adding new variants or checking sizes
        const product = await this.productModel
          .findById(item.product)
          .populate('variants.color', 'name hexValue')
          .populate('variants.size', 'name _id')
          .exec();

        if (!product) throw new NotFoundException('Product not found');

        // Iterate incoming variant updates in order
        for (const updatedVariant of dto.variantQuantities) {
          // normalize ids to string for comparisons
          const incomingVariantId = updatedVariant.variant.toString();

          const existingVariantIndex = item.variantQuantities.findIndex(
            (vq: any) => vq.variant.toString() === incomingVariantId,
          );

          // Helper: build incoming size map (sizeId -> quantity)
          const incomingSizeMap = new Map<string, number>();
          if (Array.isArray(updatedVariant.sizeQuantities)) {
            for (const sq of updatedVariant.sizeQuantities) {
              incomingSizeMap.set(sq.size.toString(), Number(sq.quantity));
            }
          }

          // === CASE A: Existing variant in cart ===
          if (existingVariantIndex > -1) {
            // Remove entire variant if client explicitly sent an empty array
            if (
              Array.isArray(updatedVariant.sizeQuantities) &&
              updatedVariant.sizeQuantities.length === 0
            ) {
              // remove the variant from item
              item.variantQuantities.splice(existingVariantIndex, 1);
              this.logger.debug(
                `Removed variant ${incomingVariantId} from cart item ${item._id}`,
              );
              continue;
            }

            // Merge incoming sizes with existing sizes
            const existingVariant =
              item.variantQuantities[existingVariantIndex];

            // Build map of existing sizes
            const existingSizeMap = new Map<string, number>();
            for (const esq of existingVariant.sizeQuantities) {
              existingSizeMap.set(esq.size.toString(), Number(esq.quantity));
            }

            // Apply incoming updates: qty > 0 => set/overwrite; qty === 0 => remove that size
            for (const [sizeId, qty] of incomingSizeMap.entries()) {
              if (qty > 0) {
                existingSizeMap.set(sizeId, qty);
              } else {
                existingSizeMap.delete(sizeId);
              }
            }

            // Convert back to array of ObjectIds; if none left, remove the variant
            const mergedSizeQuantities = Array.from(
              existingSizeMap.entries(),
            ).map(([sizeId, quantity]) => ({
              size: new Types.ObjectId(sizeId),
              quantity,
            }));

            if (mergedSizeQuantities.length === 0) {
              // remove variant entirely
              item.variantQuantities.splice(existingVariantIndex, 1);
              this.logger.debug(
                `Removed variant ${incomingVariantId} because no sizes left for cart item ${item._id}`,
              );
            } else {
              existingVariant.sizeQuantities = mergedSizeQuantities;
            }
          } else {
            // === CASE B: Adding a new variant to the item (only if sizes present and qty>0) ===
            if (
              !Array.isArray(updatedVariant.sizeQuantities) ||
              updatedVariant.sizeQuantities.length === 0
            ) {
              // nothing to add (frontend might have sent empty array unintentionally)
              this.logger.debug(
                `Skipping add for variant ${incomingVariantId} — empty sizes provided`,
              );
              continue;
            }

            // Validate the requested variant exists on the product
            const productVariant = (product.variants as any[]).find(
              (v: any) => v._id.toString() === incomingVariantId,
            );
            if (!productVariant) {
              throw new NotFoundException(
                `Variant ${incomingVariantId} not found for product ${product._id}`,
              );
            }

            // Optional: respect variant-level stockStatus if present
            if (
              (productVariant as any).stockStatus === ProductStatus.STOCKOUT
            ) {
              throw new BadRequestException(
                `Variant ${productVariant.color?.name || incomingVariantId} is out of stock`,
              );
            }

            // Validate sizes exist on that variant
            const availableSizeIds = (productVariant.size || []).map(
              (s: any) => (s._id ? s._id.toString() : s.toString()),
            );

            const validSizeQuantities = updatedVariant.sizeQuantities
              .map((sq: any) => ({
                size: sq.size.toString(),
                quantity: Number(sq.quantity),
              }))
              .filter((sq: any) => sq.quantity > 0); // skip zero/negative quantities for add

            if (validSizeQuantities.length === 0) {
              // nothing to add
              this.logger.debug(
                `No valid sizes (qty>0) to add for variant ${incomingVariantId}`,
              );
              continue;
            }

            // ensure sizes are available
            for (const sq of validSizeQuantities) {
              if (!availableSizeIds.includes(sq.size)) {
                const sizeDoc = await this.sizeModel.findById(sq.size);
                throw new BadRequestException(
                  `Size ${sizeDoc?.name || sq.size} not available for variant ${productVariant.color?.name || incomingVariantId}`,
                );
              }
            }

            // Append new variant with validated sizes
            item.variantQuantities.push({
              variant: new Types.ObjectId(productVariant._id),
              sizeQuantities: validSizeQuantities.map((sq: any) => ({
                size: new Types.ObjectId(sq.size),
                quantity: sq.quantity,
              })),
            });
          }
        } // end for each updatedVariant

        // Cleanup: remove any empty variants defensively
        item.variantQuantities = item.variantQuantities.filter(
          (vq: any) =>
            Array.isArray(vq.sizeQuantities) && vq.sizeQuantities.length > 0,
        );

        // If no variants left after updates, remove the whole cart item
        if (item.variantQuantities.length === 0) {
          cart.items.splice(itemIndex, 1);
          this.logger.debug(
            `Removed entire cart item ${item._id} as no variants remain`,
          );
        }
      } // end if variantQuantities provided

      // Update selection status if provided
      if (dto.isSelected !== undefined) {
        item.isSelected = dto.isSelected;
      }

      cart.markModified('items');
      await cart.save();

      return await this.cartService.getCartWithDetails(userId);
    } catch (err: any) {
      this.logger.error(`Error updating cart item ${itemId}: ${err.message}`);
      throw err;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private async mergeVariantQuantities(
    item: any,
    newVariants: any[],
  ): Promise<void> {
    for (const newVariant of newVariants) {
      const existingVariantIndex = item.variantQuantities.findIndex(
        (vq: any) =>
          vq.variant.toString() === newVariant.variant._id.toString(),
      );

      if (existingVariantIndex > -1) {
        // Merge sizes
        const existingVariant = item.variantQuantities[existingVariantIndex];
        for (const newSize of newVariant.sizeQuantities) {
          const existingSizeIndex = existingVariant.sizeQuantities.findIndex(
            (sq: any) => sq.size.toString() === newSize.size.toString(),
          );

          if (existingSizeIndex > -1) {
            existingVariant.sizeQuantities[existingSizeIndex].quantity +=
              newSize.quantity;
          } else {
            existingVariant.sizeQuantities.push({
              size: new Types.ObjectId(newSize.size),
              quantity: newSize.quantity,
            });
          }
        }
      } else {
        // Add new variant
        item.variantQuantities.push({
          variant: new Types.ObjectId(newVariant.variant._id),
          sizeQuantities: newVariant.sizeQuantities.map((sq: any) => ({
            size: new Types.ObjectId(sq.size),
            quantity: sq.quantity,
          })),
        });
      }
    }
  }
}
