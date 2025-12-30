import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument, CartItem } from '../schema/cart.schema';
import { Product, ProductDocument } from '../../products/schema/product.schema';
import { Design, DesignDocument } from '../../designs/schema/design.schema';
import { Size, SizeDocument } from '../../sizes/schema/size.schema';
import { CouponsService } from '../../coupons/coupons.service';
import { ProductStatus } from 'src/common/enum/product.status.enum';

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
    private readonly couponsService: CouponsService,
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

  async getCartWithDetails(userId: string, existingCart?: CartDocument) {
    const cart = existingCart || (await this.getOrCreateCart(userId));

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

    // Collect all size IDs first to batch fetch
    const allSizeIds = new Set<string>();
    cart.items.forEach((item: any) => {
      if (item.variantQuantities) {
        item.variantQuantities.forEach((vq: any) => {
          if (vq.sizeQuantities) {
            vq.sizeQuantities.forEach((sq: any) => {
              if (sq.size) allSizeIds.add(sq.size.toString());
            });
          }
        });
      }
    });

    // Batch fetch sizes
    const sizes = await this.sizeModel.find({
      _id: { $in: Array.from(allSizeIds) },
    });
    const sizeMap = new Map(sizes.map((s) => [(s as any)._id.toString(), s]));

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
            const sizeQuantitiesWithNames = vq.sizeQuantities.map((sq: any) => {
              const sizeDoc = sizeMap.get(sq.size.toString());
              const sizeTotal = this.formatCurrency(
                product.discountedPrice * sq.quantity,
              );

              return {
                size: sq.size,
                sizeName: sizeDoc?.name || 'Unknown',
                quantity: sq.quantity,
                sizeTotal: sizeTotal,
              };
            });

            const variantTotal = this.formatCurrency(
              sizeQuantitiesWithNames.reduce(
                (sum: number, sq: any) => sum + sq.sizeTotal,
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
            category: product.category,
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
    const validItems = itemsWithDetails.filter(
      (item): item is NonNullable<typeof item> => item !== null,
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

    // Calculate selected items totals
    const selectedItems = validItems.filter((item) => item.isSelected);
    const selectedItemsTotal = selectedItems.reduce(
      (sum, item) => sum + item.total,
      0,
    );

    const selectedTotalQuantity = cart.items.reduce(
      (total: number, item: any) => {
        if (!item.isSelected) return total;
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
      },
      0,
    );

    // Calculate coupon discount for selected items
    let discountTotal = 0;
    let selectedDiscountTotal = 0;
    let couponDetails: any = null;

    if (cart.coupon) {
      try {
        // Validate coupon for all items (existing logic)
        const coupon = await this.couponsService.validateCoupon(
          cart.coupon,
          userId,
          itemsTotal,
          validItems,
        );

        // Calculate discount for all items
        discountTotal = this.couponsService.calculateDiscount(
          coupon,
          itemsTotal,
          validItems,
        );

        // Calculate discount for selected items
        // We might need to re-validate or just calculate based on selected items
        // Assuming validateCoupon checks generic constraints, we just calculate discount here
        selectedDiscountTotal = this.couponsService.calculateDiscount(
          coupon,
          selectedItemsTotal,
          selectedItems,
        );

        couponDetails = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: this.formatCurrency(discountTotal),
          selectedDiscountAmount: this.formatCurrency(selectedDiscountTotal),
        };
      } catch (error) {
        // If coupon is invalid (e.g. expired or min purchase not met), remove it
        cart.coupon = undefined;
        cart.discountTotal = 0;
        await cart.save();
      }
    }

    const totalAmount = Math.max(0, itemsTotal - discountTotal);
    const selectedTotalAmount = Math.max(
      0,
      selectedItemsTotal - selectedDiscountTotal,
    );

    return {
      items: validItems,
      summary: {
        itemsTotal: this.formatCurrency(itemsTotal),
        discountTotal: this.formatCurrency(discountTotal),
        totalAmount: this.formatCurrency(totalAmount),
        itemCount: validItems.length,
        variantCount,
        totalQuantity,
        coupon: couponDetails,
        // New fields for selected items
        selectedItemsTotal: this.formatCurrency(selectedItemsTotal),
        selectedDiscountTotal: this.formatCurrency(selectedDiscountTotal),
        selectedTotalAmount: this.formatCurrency(selectedTotalAmount),
        selectedTotalQuantity,
      },
    };
  }

  // ==================== ADD DESIGN TO CART ====================

  // ==================== GET ITEM DETAILS ====================

  async getItemDetails(userId: string, itemId: string): Promise<any> {
    const cart = await this.getOrCreateCart(userId);

    const item = cart.items.find((item: any) => item._id.toString() === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const product = item.product as any;
    const design = item.design as any;

    if (!product || !product.variants) {
      throw new NotFoundException('Product or variants not found');
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
        category: product.category,
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

  // ==================== COUPON MANAGEMENT ====================

  // ==================== PRIVATE HELPERS ====================

  formatCurrency(amount: number): number {
    return Number(amount.toFixed(2));
  }

  async getCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  async getOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel
      .findOne({
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .populate({
        path: 'items.product',
        select:
          'productName brand price discountedPrice thumbnail variants category',
        populate: [
          { path: 'variants.color', select: 'name hexValue' },
          { path: 'variants.size', select: 'name' },
          { path: 'category', select: '_id' },
        ],
      })
      .populate({
        path: 'items.design',
        select: 'designName frontImage backImage leftImage rightImage',
      })
      .exec();

    if (!cart) {
      return await this.createCart(userId);
    }

    return cart;
  }

  // Add this method to your CartService class
  async validateCartForCheckout(userId: string) {
    const cart = await this.cartModel
      .findOne({
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Filter only selected items
    const selectedItems = cart.items.filter((item) => item.isSelected);

    if (selectedItems.length === 0) {
      throw new BadRequestException('No items selected for checkout');
    }

    // Validate each item in cart
    const validationErrors: string[] = [];

    for (const item of selectedItems) {
      const product = item.product as any;

      if (!product) {
        validationErrors.push(`Product not found in cart item ${item._id}`);
        continue;
      }

      // Check if product is available
      if (product.stockStatus === 'STOCKOUT') {
        validationErrors.push(
          `Product "${product.productName}" is out of stock`,
        );
        continue;
      }

      // Validate variants and sizes
      for (const vq of item.variantQuantities) {
        const variant = product.variants.find(
          (v: any) => v._id.toString() === vq.variant.toString(),
        );

        if (!variant) {
          validationErrors.push(
            `Variant ${vq.variant} not found in product ${product.productName}`,
          );
          continue;
        }

        if (variant.stockStatus === ProductStatus.STOCKOUT) {
          validationErrors.push(
            `Variant ${variant.color?.name || vq.variant} of "${product.productName}" is out of stock`,
          );
          continue;
        }

        // Validate sizes and quantities
        for (const sq of vq.sizeQuantities) {
          // Check if size exists in variant
          const sizeExists = variant.size.some(
            (s: any) => s._id.toString() === sq.size.toString(),
          );

          if (!sizeExists) {
            const sizeDoc = await this.sizeModel.findById(sq.size);
            validationErrors.push(
              `Size ${sizeDoc?.name || sq.size} not available for variant ${variant.color?.name || vq.variant} of "${product.productName}"`,
            );
          }

          // Check stock if available
          if (
            typeof product.stock === 'number' &&
            product.stock < sq.quantity
          ) {
            validationErrors.push(
              `Insufficient stock for "${product.productName}". Available: ${product.stock}, Requested: ${sq.quantity}`,
            );
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException(
        `Cart validation failed: ${validationErrors.join(', ')}`,
      );
    }

    return {
      ...cart.toObject(),
      items: selectedItems,
    };
  }
}
