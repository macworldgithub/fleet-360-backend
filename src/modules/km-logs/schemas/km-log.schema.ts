import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KmLogDocument = KmLog & Document;

export enum TripType {
  BUSINESS = 'BUSINESS',
  PRIVATE = 'PRIVATE',
}

@Schema({ _id: false })
export class LocationPoint {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop({ type: String, default: null })
  address: string | null;
}

export const LocationPointSchema = SchemaFactory.createForClass(LocationPoint);

@Schema({ timestamps: true })
export class KmLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, default: null, index: true })
  agencyId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, required: false, default: null, index: true })
  officeId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  tripDate: Date;

  @Prop({ required: true })
  startOdometerInKms: number;

  @Prop({ required: true })
  endOdometerInKms: number;

  @Prop({ required: true })
  distanceInKms: number;

  @Prop({ enum: TripType, required: true })
  tripType: TripType;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, default: null })
  businessPurpose: string | null;

  //Reference to the logbook session this trip belongs to (ATO compliance)
  @Prop({ type: Types.ObjectId, default: null, index: true })
  logbookSessionId: Types.ObjectId | null;

  @Prop({ required: true })
  startOdometerPhoto: string;

  @Prop({ required: true })
  endOdometerPhoto: string;
}

export const KmLogSchema = SchemaFactory.createForClass(KmLog);

KmLogSchema.index({ vehicleId: 1, tripDate: -1 });
KmLogSchema.index({ agencyId: 1 });
KmLogSchema.index({ officeId: 1 });
