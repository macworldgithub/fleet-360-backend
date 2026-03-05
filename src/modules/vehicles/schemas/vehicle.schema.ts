import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VehicleDocument = Vehicle & Document;

export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  HYBRID = 'HYBRID',
  EV = 'EV',
}

export enum VehicleStatus {
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  UNDER_AGREEMENT = 'UNDER_AGREEMENT',
  ASSIGNED = 'ASSIGNED',
}

export enum LeaseType {
  OWNED = 'OWNED',
  LOAN = 'LOAN',
}

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  agencyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  officeId: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  vin: string;

  @Prop({ required: true, trim: true })
  registrationNumber: string;

  @Prop({ required: true, trim: true })
  make: string;

  @Prop({ required: true, trim: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ trim: true })
  color: string;

  @Prop({ required: true, enum: FuelType })
  fuelType: FuelType;

  @Prop({ default: 0 })
  odometerInKms: number;

  @Prop({ enum: VehicleStatus, default: VehicleStatus.ACTIVATE })
  vehicleStatus: VehicleStatus;

  @Prop({ type: Date })
  purchaseDate: Date;

  @Prop()
  purchaseCost: number;

  @Prop({ required: true, enum: LeaseType, default: LeaseType.OWNED })
  leaseType: LeaseType;

  @Prop()
  residualValue: number;

  @Prop({ trim: true })
  loanProvider: string;

  @Prop()
  loanAmount: number;

  @Prop()
  interestRate: number;

  @Prop()
  loanTermMonths: number;

  @Prop()
  monthlyLoanRepayment: number;

  @Prop()
  balloonPayment: number;

  @Prop({ type: Date })
  loanStartDate: Date;

  @Prop({ type: Date })
  loanEndDate: Date;

  @Prop({ trim: true })
  lenderReferenceNumber: string;

  @Prop({ trim: true })
  loanType: string;

  @Prop({ default: false })
  insuranceRequired: boolean;

  @Prop()
  fbtValue: number;

  @Prop()
  depreciationRate: number;

  @Prop({ type: Types.ObjectId, default: null })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  requestedAt: Date;

  @Prop({ type: Types.ObjectId, default: null })
  currentDriverId: Types.ObjectId;

  @Prop({ type: Number, default: null })
  nextServiceDueAtKm: number | null;

  @Prop({ type: Date, default: null })
  scheduledServiceDate: Date | null;

  @Prop({
    type: [
      {
        amount: { type: Number, required: true },
        paymentDate: { type: Date, default: Date.now },
        remainingBalance: { type: Number },
      },
    ],
    default: [],
  })
  loanRepaymentHistory: {
    amount: number;
    paymentDate: Date;
    remainingBalance: number;
  }[];
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

VehicleSchema.index({ agencyId: 1 });
VehicleSchema.index({ officeId: 1 });
VehicleSchema.index({ vin: 1 });
