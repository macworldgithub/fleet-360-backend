import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, required: true })
  agencyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  subscriptionId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop()
  stripePaymentIntentId: string;

  @Prop({ type: Date })
  paidAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);