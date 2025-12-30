import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not set');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }

  async createCheckoutSession(params: {
    orderId: string;
    lineItems: any[];
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    discountAmount?: number;
  }) {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: params.lineItems,
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        client_reference_id: params.orderId,
        metadata: { orderId: params.orderId },
      };

      if (params.discountAmount && params.discountAmount > 0) {
        const coupon = await this.stripe.coupons.create({
          amount_off: Math.round(params.discountAmount * 100),
          currency: 'usd',
          duration: 'once',
          name: 'Order Discount',
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
      }

      return await this.stripe.checkout.sessions.create(sessionParams);
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Stripe session creation failed',
      );
    }
  }

  async constructEvent(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET not set');
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}
