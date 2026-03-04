import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KmLog, KmLogDocument, TripType } from './schemas/km-log.schema';
import {
  LogbookSession,
  LogbookSessionDocument,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import {
  Vehicle,
  VehicleDocument,
  VehicleStatus,
} from '../vehicles/schemas/vehicle.schema';
import { CreateKmLogDto } from './dto/create-km-log.dto';
import { UpdateKmLogDto } from './dto/update-km-log.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';

@Injectable()
export class KmLogsService {
  constructor(
    @InjectModel(KmLog.name)
    private kmLogModel: Model<KmLogDocument>,
    @InjectModel(LogbookSession.name)
    private sessionModel: Model<LogbookSessionDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  private validateObjectId(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  private calculateDistance(start: number, end: number): number {
    if (end < start) {
      throw new BadRequestException(
        'endOdometerInKms must be greater than startOdometerInKms',
      );
    }
    return end - start;
  }

  // Placeholder for Mapbox calculation
  private async calculateMapDistance(
    startLocation?: any,
    endLocation?: any,
  ): Promise<number | null> {
    if (!startLocation || !endLocation) return null;

    // TODO: integrate Mapbox Directions API here
    // return distance in kms

    return null;
  }

  async create(dto: CreateKmLogDto, agencyId: string) {
    this.validateObjectId(dto.vehicleId, 'vehicleId');
    this.validateObjectId(agencyId, 'agencyId');

    // 1. Validate Vehicle Status & Ownership
    const vehicle = await this.vehicleModel.findOne({
      _id: new Types.ObjectId(dto.vehicleId),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in your agency');
    }

    if (vehicle.vehicleStatus === VehicleStatus.DEACTIVATE || 
        vehicle.vehicleStatus === VehicleStatus.IN_MAINTENANCE) {
      throw new BadRequestException(
        `Cannot create KM Log for vehicle in ${vehicle.vehicleStatus} status`,
      );
    }

    const distanceInKms = this.calculateDistance(
      dto.startOdometerInKms,
      dto.endOdometerInKms,
    );

    // ── Find the OLDEST active logbook session for this vehicle ──
    const vehicleOid = new Types.ObjectId(dto.vehicleId);
    const activeSession = await this.sessionModel
      .findOne({ vehicleId: vehicleOid, isLocked: false })
      .sort({ createdAt: 1 }) // Pick the first one created
      .exec();

    const payload: any = {
      agencyId: new Types.ObjectId(agencyId),
      vehicleId: vehicleOid,
      tripDate: new Date(dto.tripDate),
      startOdometerInKms: dto.startOdometerInKms,
      endOdometerInKms: dto.endOdometerInKms,
      distanceInKms,
      tripType: dto.tripType,
      notes: dto.notes ?? null,
      businessPurpose: dto.businessPurpose ?? null,
      logbookSessionId: activeSession ? activeSession._id : null,
    };

    if (dto.officeId) {
      this.validateObjectId(dto.officeId, 'officeId');
      payload.officeId = new Types.ObjectId(dto.officeId);
    }

    const log = await this.kmLogModel.create(payload);

    // ── 2. Sync Vehicle Odometer ──
    vehicle.odometerInKms = dto.endOdometerInKms;
    await vehicle.save();

    // ── Update session odometer and totals ──
    if (activeSession) {
      const isBusiness = dto.tripType === TripType.BUSINESS;

      // Update session totals
      activeSession.endDate = new Date(dto.tripDate);
      activeSession.endOdometerInKms = dto.endOdometerInKms;
      activeSession.totalKms += distanceInKms;

      if (isBusiness) {
        activeSession.businessKms += distanceInKms;
      } else {
        activeSession.privateKms += distanceInKms;
      }

      // Re-calculate business use percentage (two decimal precision)
      activeSession.businessUsePercentage =
        activeSession.totalKms > 0
          ? Math.round(
              (activeSession.businessKms / activeSession.totalKms) * 10000,
            ) / 100
          : 0;

      // Update startOdometer ONLY if this is the first trip ever added to the session
      const linkedTripsCount = await this.kmLogModel.countDocuments({
        logbookSessionId: activeSession._id,
      });

      if (linkedTripsCount === 1) {
        activeSession.startOdometerInKms = dto.startOdometerInKms;
        activeSession.startDate = new Date(dto.tripDate);
      }

      await activeSession.save();
    }

    // ── Auto-trigger preventive maintenance check ──
    await this.maintenanceService.autoCreateMaintenance(
      dto.vehicleId,
      agencyId,
      dto.endOdometerInKms,
    );

    return log;
  }

  async findAll(filters: any) {
    const query: any = {};

    if (filters.vehicleId) {
      this.validateObjectId(filters.vehicleId, 'vehicleId');
      query.vehicleId = new Types.ObjectId(filters.vehicleId);
    }

    if (filters.officeId) {
      this.validateObjectId(filters.officeId, 'officeId');
      query.officeId = new Types.ObjectId(filters.officeId);
    }

    if (filters.agencyId) {
      this.validateObjectId(filters.agencyId, 'agencyId');
      query.agencyId = new Types.ObjectId(filters.agencyId);
    }

    if (filters.tripType) {
      query.tripType = filters.tripType;
    }

    if (filters.fromDate || filters.toDate) {
      query.tripDate = {};

      if (filters.fromDate) query.tripDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.tripDate.$lte = new Date(filters.toDate);
    }

    return this.kmLogModel.find(query).sort({ tripDate: -1 }).exec();
  }

  async findOne(logId: string, agencyId: string) {
    this.validateObjectId(logId, 'logId');

    const log = await this.kmLogModel.findOne({
      _id: new Types.ObjectId(logId),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();

    if (!log) throw new NotFoundException('KM Log not found');

    return log;
  }

  async update(logId: string, dto: UpdateKmLogDto, agencyId: string) {
    this.validateObjectId(logId, 'logId');

    const existing = await this.kmLogModel.findOne({
      _id: new Types.ObjectId(logId),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();
    
    if (!existing) {
      throw new NotFoundException('KM Log not found');
    }

    const start = dto.startOdometerInKms ?? existing.startOdometerInKms;
    const end = dto.endOdometerInKms ?? existing.endOdometerInKms;

    const distanceInKms = this.calculateDistance(start, end);

    const updated = await this.kmLogModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(logId), agencyId: new Types.ObjectId(agencyId) },
        {
          $set: {
            ...dto,
            tripDate: dto.tripDate ? new Date(dto.tripDate) : existing.tripDate,
            distanceInKms,
          },
        },
        { new: true },
      )
      .exec();

    // Sync vehicle odometer if the updated log is the latest trip (optional optimization, but here we update for consistency)
    if (updated) {
      await this.vehicleModel.updateOne(
        { _id: updated.vehicleId, agencyId: new Types.ObjectId(agencyId) },
        { $set: { odometerInKms: updated.endOdometerInKms } }
      ).exec();
    }

    return updated;
  }

  async remove(logId: string, agencyId: string) {
    this.validateObjectId(logId, 'logId');

    const deleted = await this.kmLogModel.findOneAndDelete({
      _id: new Types.ObjectId(logId),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();

    if (!deleted) {
      throw new NotFoundException('KM Log not found');
    }

    // ── 1. Revert Logbook Session Totals ──
    if (deleted.logbookSessionId) {
      const session = await this.sessionModel.findById(deleted.logbookSessionId).exec();
      if (session && !session.isLocked) {
        // Subtract deleted distance
        session.totalKms = Math.max(0, session.totalKms - deleted.distanceInKms);
        
        if (deleted.tripType === TripType.BUSINESS) {
          session.businessKms = Math.max(0, session.businessKms - deleted.distanceInKms);
        } else {
          session.privateKms = Math.max(0, session.privateKms - deleted.distanceInKms);
        }

        // Find the LATEST trip remaining in this specific session
        const sessionLatestTrip = await this.kmLogModel
          .findOne({ logbookSessionId: session._id })
          .sort({ tripDate: -1, createdAt: -1 })
          .exec();

        // Update session's end odometer and end date
        if (sessionLatestTrip) {
          session.endDate = sessionLatestTrip.tripDate;
          session.endOdometerInKms = sessionLatestTrip.endOdometerInKms;
        } else {
          // No trips left in session, roll back to session's start date/odometer
          session.endDate = session.startDate;
          session.endOdometerInKms = session.startOdometerInKms;
        }

        // Recalculate percentage
        if (session.totalKms > 0) {
          session.businessUsePercentage = Number(
            ((session.businessKms / session.totalKms) * 100).toFixed(2)
          );
        } else {
          session.businessUsePercentage = 0;
        }

        await session.save();
      }
    }

    // ── 2. Revert Vehicle Odometer (Rollback) ──
    // Find the latest trip for this vehicle in the ENTIRE system after deletion
    const latestRemainingTrip = await this.kmLogModel
      .findOne({ vehicleId: deleted.vehicleId, agencyId: new Types.ObjectId(agencyId) })
      .sort({ tripDate: -1, createdAt: -1 })
      .exec();

    if (latestRemainingTrip) {
      // Roll back vehicle odometer to the latest remaining trip's end reading
      await this.vehicleModel.updateOne(
        { _id: deleted.vehicleId },
        { $set: { odometerInKms: latestRemainingTrip.endOdometerInKms } }
      ).exec();
    } else {
      // If NO trips left, we might want to keep it as is or find a different reference.
      // For now, we leave it since we don't know the "baseline" without looking at original vehicle create odometer.
    }

    return { message: 'KM Log deleted successfully' };
  }
}
