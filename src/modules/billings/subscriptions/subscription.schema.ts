import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  TRIAL = 'TRIAL',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  agencyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  planId: Types.ObjectId;

  @Prop({ enum: BillingCycle, required: true })
  billingCycle: BillingCycle;

  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop()
  stripeCustomerId: string;

  @Prop()
  stripeSubscriptionId: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);