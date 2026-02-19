import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LogbookSessionDocument = LogbookSession & Document;

/**
 * ATO Logbook Session Status.
 * DRAFT   – session is being built / editable
 * SUBMITTED – session submitted for review
 * LOCKED  – session finalised; no further edits allowed
 */
export enum LogbookSessionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  LOCKED = 'LOCKED',
}

@Schema({ timestamps: true })
export class LogbookSession {
  /** Vehicle this logbook session belongs to */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  agencyId: Types.ObjectId;

  /** Inclusive start date of the logbook period */
  @Prop({ type: Date, required: true })
  startDate: Date;

  /** Inclusive end date of the logbook period (null if session is live) */
  @Prop({ type: Date, required: false, default: null })
  endDate: Date | null;

  @Prop({ required: true })
  startOdometerInKms: number;

  @Prop({ type: Number, required: false, default: null })
  endOdometerInKms: number | null;

  /** Computed: sum of all trip distances in the session */
  @Prop({ required: true, default: 0 })
  totalKms: number;

  /** Computed: sum of BUSINESS trip distances */
  @Prop({ required: true, default: 0 })
  businessKms: number;

  /** Computed: sum of PRIVATE trip distances */
  @Prop({ required: true, default: 0 })
  privateKms: number;

  /**
   * Computed: (businessKms / totalKms) * 100
   * ATO uses this percentage for FBT deduction claims.
   */
  @Prop({ required: true })
  businessUsePercentage: number;

  /**
   * ATO requires a minimum continuous period of 12 weeks (84 days).
   * True when endDate − startDate >= 84 days.
   */
  @Prop({ required: true, default: false })
  minimumPeriodSatisfied: boolean;

  @Prop({ enum: LogbookSessionStatus, default: LogbookSessionStatus.DRAFT })
  status: LogbookSessionStatus;

  /** Convenience flag — true when status is LOCKED */
  @Prop({ default: false })
  isLocked: boolean;

  @Prop({ type: Date, default: null })
  lockedAt: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  lockedBy: Types.ObjectId | null;

  /**
   * FBT year string, e.g. "2025-2026".
   * Australian FBT year runs 1 Apr – 31 Mar.
   */
  @Prop({ type: String, required: true })
  fbtYear: string;

  /** True if session satisfies all ATO validity criteria for FBT claims */
  @Prop({ default: false })
  isValidForFbt: boolean;
}

export const LogbookSessionSchema =
  SchemaFactory.createForClass(LogbookSession);

/**
 * Compound index to enforce uniqueness and fast lookups
 * for sessions per vehicle within a date range.
 */
LogbookSessionSchema.index(
  { vehicleId: 1, startDate: 1, endDate: 1 },
  { unique: true },
);
