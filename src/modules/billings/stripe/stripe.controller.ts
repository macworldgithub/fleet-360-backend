// stripe.controller.ts
import { Controller, Post, Req, Res, HttpCode } from '@nestjs/common';
import express from 'express';
import { StripeService } from './stripe.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '../payments/payment.schema';
import Stripe from 'stripe';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: express.Request, @Res() res: express.Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      // Important: make sure body-parser raw is used or express.json({verify}) to get raw buffer
      event = this.stripeService.constructEvent(req.body, sig);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Received Stripe event:', event.type);

    const data = event.data.object as any;

    switch (event.type) {
     case 'invoice.payment_succeeded':
  const invoice = event.data.object as any;

  // First try to find subscription by Stripe subscription ID
  let dbSubscription = await this.subscriptionsService.findByStripeId(invoice.subscription);

  // Fallback: find subscription by Stripe customer ID
  if (!dbSubscription && invoice.customer) {
    dbSubscription = await this.subscriptionsService.findByCustomerId(invoice.customer);
  }

  if (!dbSubscription) {
    console.log(`Subscription not found for Stripe invoice: ${invoice.id} customer: ${invoice.customer}`);
    break;
  }

  let payment = await this.paymentsService.findByStripePaymentIntent(invoice.payment_intent);

  if (!payment) {
    await this.paymentsService.create({
      agencyId: dbSubscription.agencyId,
      subscriptionId: dbSubscription._id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: PaymentStatus.SUCCESS,
      stripePaymentIntentId: invoice.payment_intent,
      paidAt: new Date(),
    });
    console.log(`Payment record created for subscriptionId: ${dbSubscription._id}`);
  } else {
    await this.paymentsService.updateStatusByIntent(invoice.payment_intent, PaymentStatus.SUCCESS, new Date());
    console.log(`Payment record updated for intent: ${invoice.payment_intent}`);
  }
  break;

      case 'invoice.payment_failed':
        await this.paymentsService.updateStatusByIntent(data.payment_intent, PaymentStatus.FAILED);
        console.log('Payment failed:', data.payment_intent);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  }
}