import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './plan.schema';
import { CreatePlanDto } from './create-plan.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PlansService {
  constructor(
  @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
  private stripeService: StripeService
) {}

  async create(dto: CreatePlanDto): Promise<Plan> {

  // 1️⃣ Create Stripe product
  const product = await this.stripeService.createProduct(dto.name);

  // 2️⃣ Create Monthly price
  const monthlyPrice = await this.stripeService.createPrice(
    product.id,
    dto.monthlyPrice,
    'month'
  );

  // 3️⃣ Create Yearly price
  const yearlyPrice = await this.stripeService.createPrice(
    product.id,
    dto.yearlyPrice,
    'year'
  );

  // 4️⃣ Save plan in DB
  const plan = new this.planModel({
    ...dto,
    stripePriceMonthlyId: monthlyPrice.id,
    stripePriceYearlyId: yearlyPrice.id,
  });

  return plan.save();
}

  async findAll(): Promise<Plan[]> {
    return this.planModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.planModel.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async update(id: string, dto: Partial<CreatePlanDto>): Promise<Plan> {
    const plan = await this.planModel.findByIdAndUpdate(id, dto, { new: true });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async remove(id: string): Promise<void> {
    const plan = await this.planModel.findByIdAndUpdate(id, { isActive: false });
    if (!plan) throw new NotFoundException('Plan not found');
  }
}