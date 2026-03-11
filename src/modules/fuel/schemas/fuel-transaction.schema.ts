import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FuelTransactionDocument = FuelTransaction & Document;

export enum FuelProvider {
  MANUAL = 'MANUAL',
  WEX = 'WEX',
  FLEETCARD = 'FLEETCARD',
  FLEETCARE = 'FLEETCARE',
  SHELL = 'SHELL',
  BP = 'BP',
  CALTEX = 'CALTEX',
}

@Schema({ timestamps: true })
export class FuelTransaction {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  agencyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: String, default: null })
  fuelCardNumber?: string;

  @Prop({ type: Date, required: true })
  fuelDate: Date;

  @Prop({ required: true })
  liters: number;

  @Prop({ required: true })
  pricePerLiter: number;

  @Prop({ required: true })
  totalCost: number;

  @Prop({ type: String, default: null })
  stationName?: string;

  @Prop({ type: Number, default: null })
  odometer?: number;

  @Prop({ type: String, default: null })
  driverName?: string;

  @Prop({ enum: FuelProvider, default: FuelProvider.MANUAL })
  provider: FuelProvider;

  @Prop({ type: String, default: null })
  transactionReference?: string;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const FuelTransactionSchema =
  SchemaFactory.createForClass(FuelTransaction);

FuelTransactionSchema.index({ agencyId: 1 });
FuelTransactionSchema.index({ vehicleId: 1 });
FuelTransactionSchema.index({ fuelDate: -1 });