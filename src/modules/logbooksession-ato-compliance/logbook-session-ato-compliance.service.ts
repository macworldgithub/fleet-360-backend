import {
  BadRequestException,
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
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';

/** ATO minimum continuous logbook period: 12 weeks = 84 days */
const ATO_MIN_PERIOD_DAYS = 84;

@Injectable()
export class LogbookSessionAtoComplianceService {
  constructor(
    @InjectModel(LogbookSession.name)
    private readonly sessionModel: Model<LogbookSessionDocument>,
    @InjectModel(KmLog.name)
    private readonly kmLogModel: Model<KmLogDocument>,
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
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

    // ── Fetch vehicle to get start odometer ──
    const vehicle = await this.vehicleModel.findById(vehicleOid).exec();
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // ── Auto-lock any existing DRAFT session for this vehicle ──
    await this.sessionModel.updateOne(
      { vehicleId: vehicleOid, status: LogbookSessionStatus.DRAFT },
      {
        $set: {
          status: LogbookSessionStatus.LOCKED,
          endDate: new Date(),
          isLocked: true,
          lockedAt: new Date(),
        },
      },
    );

    const periodDays = startDate && endDate ? this.daysBetween(startDate, endDate) : 0;
    const minimumPeriodSatisfied = periodDays >= ATO_MIN_PERIOD_DAYS;

    const session = await this.sessionModel.create({
      vehicleId: vehicleOid,
      agencyId: agencyOid,
      startDate,
      endDate: null,
      startOdometerInKms: vehicle.odometerInKms || 0,
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
