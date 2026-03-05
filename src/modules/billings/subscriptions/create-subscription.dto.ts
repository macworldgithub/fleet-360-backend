import { IsEnum, IsMongoId } from 'class-validator';
import { BillingCycle } from './subscription.schema';

export class CreateSubscriptionDto {
  @IsMongoId()
  agencyId: string;

  @IsMongoId()
  planId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}