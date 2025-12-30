import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from 'src/modules/cart/schema/cart.schema';
import { CartService } from 'src/modules/cart/services/cart.service';
import { CouponsService } from 'src/modules/coupons/coupons.service';

@Injectable()
export class CartCouponService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    private readonly couponsService: CouponsService,
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
  ) {}

  // ==================== COUPON MANAGEMENT ====================

  async applyCoupon(userId: string, code: string): Promise<any> {
    const cart = await this.cartService.getOrCreateCart(userId);

    // Calculate current cart total
    const cartDetails = await this.cartService.getCartWithDetails(userId, cart);
    const itemsTotal = cartDetails.summary.itemsTotal;

    // Validate coupon
    await this.couponsService.validateCoupon(
      code,
      userId,
      itemsTotal,
      cartDetails.items,
    );

    // Apply coupon
    cart.coupon = code;
    await cart.save();

    return this.cartService.getCartWithDetails(userId, cart);
  }

  async removeCoupon(userId: string): Promise<any> {
    const cart = await this.cartService.getOrCreateCart(userId);
    cart.coupon = undefined;
    cart.discountTotal = 0;
    await cart.save();

    return this.cartService.getCartWithDetails(userId, cart);
  }
}
