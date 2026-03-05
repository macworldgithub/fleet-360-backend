import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, required: true })
  agencyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  subscriptionId: Types.ObjectId;

  @Prop()
  stripeInvoiceId: string;

  @Prop()
  amountDue: number;

  @Prop()
  currency: string;

  @Prop()
  invoicePdf: string;

  @Prop()
  invoiceUrl: string;

  @Prop()
  status: string;

  @Prop()
  dueDate: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);