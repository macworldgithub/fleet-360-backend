import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  LogbookSession,
  LogbookSessionDocument,
  LogbookSessionStatus,
} from './schemas/logbook-session.schema';
import {
  KmLog,
  KmLogDocument,
} from '../km-logs/schemas/km-log.schema';
import { CreateLogbookSessionDto } from './dto/create-logbook-session.dto';

/** ATO minimum continuous logbook period: 12 weeks = 84 days */
const ATO_MIN_PERIOD_DAYS = 84;

@Injectable()
export class LogbookSessionAtoComplianceService {
  constructor(
    @InjectModel(LogbookSession.name)
    private readonly sessionModel: Model<LogbookSessionDocument>,
    @InjectModel(KmLog.name)
    private readonly kmLogModel: Model<KmLogDocument>,
  ) {}

  // ─── helpers ──────────────────────────────────────────────────────────

  private validateObjectId(id: string, label: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  /**
   * Calculate difference in whole days (inclusive of both start & end).
   */
  private daysBetween(start: Date, end: Date): number {
    const ms = end.getTime() - start.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  // ─── createLogbookSession ────────────────────────────────────────────

  async createLogbookSession(
    dto: CreateLogbookSessionDto,
    agencyId: string,
    performedBy: string,
  ) {
    this.validateObjectId(dto.vehicleId, 'vehicleId');
    this.validateObjectId(agencyId, 'agencyId');
    this.validateObjectId(performedBy, 'performedBy');

    const vehicleOid = new Types.ObjectId(dto.vehicleId);
    const agencyOid = new Types.ObjectId(agencyId);

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // ── Prevent overlapping sessions for the same vehicle ──
    const overlappingQuery: any = {
      vehicleId: vehicleOid,
      $or: [
        // Existing session that is still open (no endDate)
        { endDate: null },
        // Existing session that overlaps with the new range
        {
          startDate: { $lte: endDate || new Date() },
          endDate: { $gte: startDate },
        },
      ],
    };

    // If starting a live session, just check for any existing open sessions
    if (!endDate) {
      delete overlappingQuery.$or;
      overlappingQuery.endDate = null;
    }

    const overlapping = await this.sessionModel
      .findOne(overlappingQuery)
      .lean()
      .exec();

    if (overlapping) {
      throw new ConflictException(
        'An overlapping or active logbook session already exists for this vehicle.',
      );
    }

    const periodDays = endDate ? this.daysBetween(startDate, endDate) : 0;
    const minimumPeriodSatisfied = periodDays >= ATO_MIN_PERIOD_DAYS;

    const session = await this.sessionModel.create({
      vehicleId: vehicleOid,
      agencyId: agencyOid,
      startDate,
      endDate,
      startOdometerInKms: 0,
      endOdometerInKms: null,
      totalKms: 0,
      businessKms: 0,
      privateKms: 0,
      businessUsePercentage: 0,
      minimumPeriodSatisfied,
      status: LogbookSessionStatus.DRAFT,
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      fbtYear: dto.fbtYear,
      isValidForFbt: false,
    });

    return session;
  }

  // ─── lockLogbookSession ──────────────────────────────────────────────

  async lockLogbookSession(sessionId: string, userId: string, agencyId: string) {
    this.validateObjectId(sessionId, 'sessionId');
    this.validateObjectId(userId, 'userId');
    this.validateObjectId(agencyId, 'agencyId');

    const session = await this.sessionModel
      .findOne({
        _id: new Types.ObjectId(sessionId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!session) {
      throw new NotFoundException('Logbook session not found.');
    }

    if (session.isLocked) {
      throw new BadRequestException('This logbook session is already locked.');
    }

    // When locking, we finalize the endDate if it was live
    if (!session.endDate) {
      const lastTrip = await this.kmLogModel
        .findOne({ logbookSessionId: session._id })
        .sort({ tripDate: -1 })
        .exec();

      if (!lastTrip) {
        throw new BadRequestException('Cannot lock an empty logbook session.');
      }

      session.endDate = lastTrip.tripDate;
      session.endOdometerInKms = lastTrip.endOdometerInKms;

      const periodDays = this.daysBetween(session.startDate, session.endDate);
      session.minimumPeriodSatisfied = periodDays >= ATO_MIN_PERIOD_DAYS;
    }

    if (!session.minimumPeriodSatisfied) {
      throw new BadRequestException(
        'Cannot lock a session that does not satisfy the ATO minimum period of 12 continuous weeks.',
      );
    }

    const userOid = new Types.ObjectId(userId);

    session.status = LogbookSessionStatus.LOCKED;
    session.isLocked = true;
    session.lockedAt = new Date();
    session.lockedBy = userOid;

    // ATO validity check at the moment of locking
    session.isValidForFbt =
      session.minimumPeriodSatisfied && session.businessKms > 0;

    await session.save();
    return session;
  }

  // ─── getSessionById ──────────────────────────────────────────────────

  async getSessionById(sessionId: string, agencyId: string) {
    this.validateObjectId(sessionId, 'sessionId');
    this.validateObjectId(agencyId, 'agencyId');

    const session = await this.sessionModel
      .findOne({
        _id: new Types.ObjectId(sessionId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .lean()
      .exec();

    if (!session) {
      throw new NotFoundException('Logbook session not found.');
    }

    return session;
  }

  // ─── getSessionsByVehicle ────────────────────────────────────────────

  async getSessionsByVehicle(vehicleId: string, agencyId: string) {
    this.validateObjectId(vehicleId, 'vehicleId');
    this.validateObjectId(agencyId, 'agencyId');

    return this.sessionModel
      .find({
        vehicleId: new Types.ObjectId(vehicleId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .sort({ startDate: -1 })
      .lean()
      .exec();
  }
}
