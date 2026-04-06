import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  // 👤 Who receives it (Driver/Admin later)
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  // Multi-tenant support
  @Prop({ type: Types.ObjectId, ref: 'Agency', index: true })
  agencyId: Types.ObjectId;

  // Strong typing later
  @Prop({ required: true })
  type: string;

  // Read status
  @Prop({ default: false, index: true })
  isRead: boolean;

  // Extra data (vehicleId, maintenanceId, etc.)
  @Prop({ type: Object, default: null })
  meta: any;

  // WHO IS THIS FOR (VERY IMPORTANT)
  @Prop({ enum: ['DRIVER', 'ADMIN'], required: true })
  target: 'DRIVER' | 'ADMIN';
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);