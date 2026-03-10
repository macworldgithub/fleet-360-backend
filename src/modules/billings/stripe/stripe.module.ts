import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [ConfigModule, SubscriptionsModule],
  providers: [StripeService],
  controllers: [StripeWebhookController],
  exports: [StripeService],
})
export class StripeModule {}