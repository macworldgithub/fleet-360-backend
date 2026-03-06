import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeSecret = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeSecret, { apiVersion: '2026-02-25.clover' });
  }

  async createProduct(name: string): Promise<Stripe.Product> {
    return this.stripe.products.create({ name });
  }

  async createPrice(productId: string, amount: number, interval: 'month' | 'year'): Promise<Stripe.Price> {
    return this.stripe.prices.create({
      product: productId,
      unit_amount: amount * 100, // amount in cents
      currency: 'usd',
      recurring: { interval },
    });
  }

  async createCustomer(email: string, paymentMethodId?: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      payment_method: paymentMethodId,
      invoice_settings: paymentMethodId ? { default_payment_method: paymentMethodId } : undefined,
    });
  }

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });
  }

  // Use this for webhook signature verification
  constructEvent(payload: Buffer, sig: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, sig, secret);
  }
}