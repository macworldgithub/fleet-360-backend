import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ComplianceAuditDocument = ComplianceAudit & Document;

export enum AuditEntityType {
  KM_LOG = 'KM_LOG',
  LOGBOOK_SESSION = 'LOGBOOK_SESSION',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  LOCK = 'LOCK',
}


@Schema({ timestamps: true })
export class ComplianceAudit {
  /** The _id of the entity being audited */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId: Types.ObjectId;

  @Prop({ enum: AuditEntityType, required: true })
  entityType: AuditEntityType;

  @Prop({ enum: AuditAction, required: true })
  action: AuditAction;

  /** User who performed the action */
  @Prop({ type: Types.ObjectId, required: true })
  performedBy: Types.ObjectId;

  /** Snapshot of the entity before the change (null for CREATE) */
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  previousValue: Record<string, any> | null;

  /** Snapshot of the entity after the change */
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  newValue: Record<string, any> | null;
}

export const ComplianceAuditSchema =
  SchemaFactory.createForClass(ComplianceAudit);

ComplianceAuditSchema.index({ entityType: 1, action: 1 });
