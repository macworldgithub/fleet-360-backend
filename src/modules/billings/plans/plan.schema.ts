import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

export enum PlanTier {
  ESSENTIAL = 'ESSENTIAL',
  OPTIMISED = 'OPTIMISED',
  PARTNER = 'PARTNER',
}

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ enum: PlanTier, required: true })
  tier: PlanTier;

  @Prop({ required: true })
  monthlyPrice: number;

  @Prop({ required: true })
  yearlyPrice: number;

  @Prop({ default: null })
  vehicleLimit: number;

  @Prop({ default: null })
  driverLimit: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  stripePriceMonthlyId: string;

  @Prop({ default: null })
  stripePriceYearlyId: string;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);