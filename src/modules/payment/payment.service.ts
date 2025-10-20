import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

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
      // Validate amount
      if (amount <= 0) {
        throw new InternalServerErrorException('Invalid amount for payment');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to create payment intent: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create payment intent: ${error.message}`,
      );
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      this.logger.log(
        `Payment intent ${paymentIntentId} status: ${paymentIntent.status}`,
      );
      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to confirm payment: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to confirm payment: ${error.message}`,
      );
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      this.logger.log(
        `Refund created: ${refund.id} for payment intent: ${paymentIntentId}`,
      );
      return refund;
    } catch (error) {
      this.logger.error(
        `Failed to create refund: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create refund: ${error.message}`,
      );
    }
  }

  async getPaymentIntent(paymentIntentId: string) {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(
        `Failed to get payment intent: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get payment intent: ${error.message}`,
      );
    }
  }
}
