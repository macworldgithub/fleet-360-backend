import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { StripeService } from './stripe/stripe.service';
import { Subscription } from 'rxjs';
import { SubscriptionSchema } from './subscriptions/subscription.schema';
import { Plan, PlanSchema } from './plans/plan.schema';
import { Agency, AgencySchema } from 'src/agencies/schemas/agency.schema';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { Payment, PaymentSchema } from './payments/payment.schema';
import { Invoice, InvoiceSchema } from './invoices/invoice.schema';
import { PlansController } from './plans/plans.controller';
import { PaymentsController } from './payments/payments.controller';
import { InvoicesController } from './invoices/invoices.controller';
import { PlansService } from './plans/plans.service';
import { PaymentsService } from './payments/payments.service';
import { InvoicesService } from './invoices/invoices.service';
import { StripeWebhookController } from './stripe/stripe-webhook.controller';


@Module({
  imports: [

    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: Agency.name, schema: AgencySchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema }
    ]),

  ],

  controllers: [
    PlansController,
    SubscriptionsController,
    PaymentsController,
    InvoicesController,
    StripeWebhookController,
  ],

  providers: [
    StripeService,
    PlansService,
    SubscriptionsService,
    PaymentsService,
    InvoicesService,
  ],

})
export class BillingModule {}