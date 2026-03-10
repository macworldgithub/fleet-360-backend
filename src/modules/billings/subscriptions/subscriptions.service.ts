import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument, BillingCycle, SubscriptionStatus } from './subscription.schema';
import { CreateSubscriptionDto } from './create-subscription.dto';
import { PlansService } from '../plans/plans.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name) private subModel: Model<SubscriptionDocument>,
    private plansService: PlansService,
    private stripeService: StripeService
  ) {}

  async create(dto: CreateSubscriptionDto) {
    // Find plan
    const plan = await this.plansService.findOne(dto.planId);

    if (!plan) throw new NotFoundException('Plan not found');

    // Create Stripe customer (dummy email for testing)
    const customer = await this.stripeService.createCustomer(
  `agency-${dto.agencyId}@test.com`,
  'pm_card_visa' // Stripe test payment method
);

    // Determine priceId
    const priceId = dto.billingCycle === BillingCycle.MONTHLY
      ? plan.stripePriceMonthlyId
      : plan.stripePriceYearlyId;

    // Create Stripe subscription
    const stripeSub = await this.stripeService.createSubscription(customer.id, priceId);

    // Save subscription in DB
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + (dto.billingCycle === BillingCycle.MONTHLY ? 1 : 12));

    const subscription = new this.subModel({
      ...dto,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: stripeSub.id,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
    });

    return subscription.save();
  }

  async findAll(agencyId?: string, role?: string): Promise<Subscription[]> {
    const isPrincipal = role === 'PRINCIPAL';
    const filter: any = {};
    
    if (!isPrincipal && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    } else if (isPrincipal && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    return this.subModel.find(filter).exec();
  }

  async findOne(id: string, agencyId?: string, role?: string): Promise<Subscription> {
    const filter: any = { _id: id };
    if (role !== 'PRINCIPAL' && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const sub = await this.subModel.findOne(filter);
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async updateStatus(stripeSubscriptionId: string, status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED') {
  const sub = await this.subModel.findOne({ stripeSubscriptionId });
  if (!sub) {
    console.warn(`Subscription not found: ${stripeSubscriptionId}`);
    return;
  }

  // Cast status string to enum type
  sub.status = status as SubscriptionStatus;
  await sub.save();
}
async findByStripeId(stripeSubscriptionId: string) {
  return this.subModel.findOne({ stripeSubscriptionId }).exec();
}
}