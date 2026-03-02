import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AgencyDocument = Agency & Document;

export enum SubscriptionTier {
  ESSENTIAL = 'ESSENTIAL',
  OPTIMISED = 'OPTIMISED',
  PARTNER = 'PARTNER',
}

export enum AgencyRole {
  PRINCIPAL = 'PRINCIPAL',
  FLEET_MANAGER = 'FLEET_MANAGER',
}

@Schema({ timestamps: true })
export class Agency {
  @Prop({ required: true, unique: true, trim: true })
  agencyName: string;

  @Prop({ default: 'Real Estate Agency' })
  businessType: string;

  @Prop({ type: String, default: null })
  abn: string | null;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  contactEmail: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: String, default: 'Australia' })
  country: string;

  @Prop({ type: String, default: 'Victoria' })
  state: string;

  @Prop({ type: String, default: 'Melbourne' })
  city: string;

  @Prop({
    type: String,
    enum: SubscriptionTier,
    default: SubscriptionTier.ESSENTIAL,
  })
  subscriptionTier: SubscriptionTier;

  @Prop({
    type: String,
    enum: AgencyRole,
    default: AgencyRole.FLEET_MANAGER,
  })
  role: AgencyRole;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  // ===== AUTH FIELDS =====
  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  emailVerificationTokenHash: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationExpiresAt: Date | null;

  @Prop({ type: String, default: null })
  resetPasswordTokenHash: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpiresAt: Date | null;
}

export const AgencySchema = SchemaFactory.createForClass(Agency);
