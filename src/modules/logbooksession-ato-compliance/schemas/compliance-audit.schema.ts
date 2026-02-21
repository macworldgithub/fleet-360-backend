import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ComplianceAuditDocument = ComplianceAudit & Document;

export enum AuditAction {
  CREATE = 'CREATE',
  LOCK = 'LOCK',
}

@Schema({ timestamps: true })
export class ComplianceAudit {
  /** The LogbookSession _id being audited */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  sessionId: Types.ObjectId;

  /** What happened */
  @Prop({ enum: AuditAction, required: true })
  action: AuditAction;

  /** User who performed the action */
  @Prop({ type: Types.ObjectId, required: true })
  performedBy: Types.ObjectId;

  /** Snapshot before change (null for CREATE) */
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  previousValue: Record<string, any> | null;

  /** Snapshot after change */
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  newValue: Record<string, any> | null;
}

export const ComplianceAuditSchema =
  SchemaFactory.createForClass(ComplianceAudit);

/** Helpful index for fetching session history quickly */
ComplianceAuditSchema.index({ sessionId: 1, createdAt: -1 });
