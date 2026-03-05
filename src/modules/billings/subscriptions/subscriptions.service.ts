import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument, BillingCycle } from './subscription.schema';
import { CreateSubscriptionDto } from './create-subscription.dto';
import { StripeService } from '../stripe/stripe.service';
import { Plan, PlanDocument } from '../plans/plan.schema';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name) private subModel: Model<SubscriptionDocument>,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private stripeService: StripeService
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const plan = await this.planModel.findById(dto.planId);
    if (!plan) throw new NotFoundException('Plan not found');

    // 1️⃣ Create Stripe customer
    const stripeCustomer = await this.stripeService.createCustomer('agency@example.com', 'Agency Name');

    // 2️⃣ Get Stripe Price ID
    const priceId = dto.billingCycle === BillingCycle.MONTHLY ? plan.stripePriceMonthlyId : plan.stripePriceYearlyId;

    // 3️⃣ Create Stripe subscription
    const stripeSubscription = await this.stripeService.createSubscription(stripeCustomer.id, priceId);

    // 4️⃣ Save in DB
    const subscription = new this.subModel({
      agencyId: dto.agencyId,
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      stripeCustomerId: stripeCustomer.id,
      stripeSubscriptionId: stripeSubscription.id,
      startDate: new Date(),
      status: 'ACTIVE',
    });

    return subscription.save();
  }

  async findAll(): Promise<Subscription[]> {
    return this.subModel.find().exec();
  }

  async findOne(id: string): Promise<Subscription> {
    const sub = await this.subModel.findById(id);
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async findByStripeId(stripeSubscriptionId: string) {
  return this.subModel.findOne({ stripeSubscriptionId }).exec();
}

async findByCustomerId(stripeCustomerId: string) {
  return this.subModel.findOne({ stripeCustomerId }).exec();
}
}