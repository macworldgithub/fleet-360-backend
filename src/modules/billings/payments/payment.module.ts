import { Module } from '@nestjs/common';
import { StripeModule } from '../stripe/stripe.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionsController } from '../subscriptions/subscriptions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription, SubscriptionSchema } from '../subscriptions/subscription.schema';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
    StripeModule,
    PlansModule,
  ],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
})
export class PaymentModule {}