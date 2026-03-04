import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IncidentDocument = Incident & Document;

export enum IncidentType {
  ACCIDENT = 'ACCIDENT',
  DAMAGE = 'DAMAGE',
  THEFT = 'THEFT',
  BREAKDOWN = 'BREAKDOWN',
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Schema({ timestamps: true })
export class Incident {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  agencyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  officeId?: Types.ObjectId;

  @Prop({ required: true, enum: IncidentType })
  incidentType: IncidentType;

  @Prop({ type: Date, required: true })
  incidentDate: Date;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, default: null })
  damageSeverity?: string | null;

  @Prop({ type: Number, default: null })
  estimatedRepairCost?: number | null;

  @Prop({ type: Boolean, default: false })
  insuranceClaimFiled: boolean;

  @Prop({ type: String, default: null })
  policeReportNumber?: string | null;

  @Prop({ type: [String], default: [] })
  evidencePhotos: string[];

  @Prop({ enum: IncidentStatus, default: IncidentStatus.REPORTED })
  status: IncidentStatus;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);

IncidentSchema.index({ agencyId: 1 });
IncidentSchema.index({ vehicleId: 1 });
IncidentSchema.index({ incidentDate: -1 });
