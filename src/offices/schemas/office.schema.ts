import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OfficeDocument = Office & Document;

@Schema({ timestamps: true })
export class Office {
  @Prop({ type: Types.ObjectId, ref: 'Agency', required: true })
  agencyId: Types.ObjectId;

  @Prop({ required: true })
  officeName: string;

  @Prop({ required: true })
  officeType: string;

  @Prop({ required: true })
  officeHours: string;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: String, default: 'Australia' })
  country: string;

  @Prop({ type: String, default: 'Victoria' })
  state: string;

  @Prop({ type: String, default: 'Melbourne' })
  city: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const OfficeSchema = SchemaFactory.createForClass(Office);
