import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './plan.schema';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
    StripeModule, // Inject StripeService into PlansService
  ],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService], // Export so SubscriptionsService can use it
})
export class PlansModule {}