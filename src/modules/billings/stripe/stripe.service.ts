import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeSecret = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeSecret, { apiVersion: '2026-02-25.clover' });
  }

  async createProduct(name: string) {
    return this.stripe.products.create({
        name,
    });
    }

async createPrice(productId: string, amount: number, interval: 'month' | 'year') {
  return this.stripe.prices.create({
    product: productId,
    unit_amount: amount * 100,
    currency: 'usd',
    recurring: { interval },
  });
}

  async createCustomer(email: string, name: string) {
    return this.stripe.customers.create({ email, name });
  }

  async createSubscription(customerId: string, priceId: string) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  }

  constructEvent(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}