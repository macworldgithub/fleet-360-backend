import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DriverDocument = Driver & Document;

@Schema({ timestamps: true })
export class Driver {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  agencyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  phoneNumber: string;

  @Prop({ required: true, unique: true, trim: true })
  driverLicenseNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', default: null })
  assignedVehicle: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  profilePicture: string | null;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

DriverSchema.index({ email: 1 });
DriverSchema.index({ driverLicenseNumber: 1 });
