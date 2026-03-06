import { Controller, Post, Req, Res, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import express from 'express';
import { StripeService } from './stripe.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Controller('stripe/webhook')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: express.Request,              // Express Request
    @Res() res: express.Response,             // Express Response
    @Headers('stripe-signature') signature: string,
  ) {
    // Stripe sends raw bytes; bodyParser.raw() ensures req.body is a Buffer
    const payload = req.body as Buffer; 
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    try {
      // Verify the event with Stripe signature
      event = this.stripeService.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Handle different Stripe event types
      switch (event.type) {
        case 'invoice.payment_succeeded': {
          const subscriptionId = event.data.object['subscription'];
          await this.subscriptionsService.updateStatus(subscriptionId, 'ACTIVE');
          break;
        }
        case 'invoice.payment_failed': {
          const subscriptionId = event.data.object['subscription'];
          await this.subscriptionsService.updateStatus(subscriptionId, 'PAST_DUE');
          break;
        }
        case 'customer.subscription.deleted': {
          const subscriptionId = event.data.object['id'];
          await this.subscriptionsService.updateStatus(subscriptionId, 'CANCELED');
          break;
        }
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Error handling Stripe webhook event', err);
      res.status(500).send('Internal Server Error');
    }
  }
}