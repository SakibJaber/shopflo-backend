import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeSecretKey = configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in the configuration');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createPaymentIntent(amount: number, metadata: any) {
    try {
      return await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create payment intent: ${error.message}`,
      );
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to confirm payment: ${error.message}`,
      );
    }
  }
}
