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
import { CreateKmLogDto } from './dto/create-km-log.dto';
import { UpdateKmLogDto } from './dto/update-km-log.dto';

@Injectable()
export class KmLogsService {
  constructor(
    @InjectModel(KmLog.name)
    private kmLogModel: Model<KmLogDocument>,
    @InjectModel(LogbookSession.name)
    private sessionModel: Model<LogbookSessionDocument>,
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

  async create(dto: CreateKmLogDto) {
    this.validateObjectId(dto.vehicleId, 'vehicleId');

    if (dto.agencyId) this.validateObjectId(dto.agencyId, 'agencyId');
    if (dto.officeId) this.validateObjectId(dto.officeId, 'officeId');

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

    if (dto.agencyId) payload.agencyId = new Types.ObjectId(dto.agencyId);
    if (dto.officeId) payload.officeId = new Types.ObjectId(dto.officeId);

    const log = await this.kmLogModel.create(payload);

    // ── Sync session odometer and totals ──
    if (activeSession) {
      const isBusiness = dto.tripType === TripType.BUSINESS;

      // Update session totals
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
          ? Math.round((activeSession.businessKms / activeSession.totalKms) * 10000) / 100
          : 0;

      // Update startOdometer ONLY if this is the first trip ever added to the session
      // (Check count of trips linked to this session)
      const linkedTripsCount = await this.kmLogModel.countDocuments({
        logbookSessionId: activeSession._id,
      });

      if (linkedTripsCount === 1) {
        activeSession.startOdometerInKms = dto.startOdometerInKms;
      }

      await activeSession.save();
    }

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

  async findOne(logId: string) {
    this.validateObjectId(logId, 'logId');

    const log = await this.kmLogModel.findOne({
      _id: new Types.ObjectId(logId),
    });

    if (!log) throw new NotFoundException('KM Log not found');

    return log;
  }

  async update(logId: string, dto: UpdateKmLogDto) {
    this.validateObjectId(logId, 'logId');

    const existing = await this.kmLogModel.findById(logId);
    if (!existing) {
      throw new NotFoundException('KM Log not found');
    }

    const start = dto.startOdometerInKms ?? existing.startOdometerInKms;
    const end = dto.endOdometerInKms ?? existing.endOdometerInKms;

    const distanceInKms = this.calculateDistance(start, end);

    const updated = await this.kmLogModel
      .findByIdAndUpdate(
        logId,
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

    return updated;
  }

  async remove(logId: string) {
    this.validateObjectId(logId, 'logId');

    const deleted = await this.kmLogModel.findByIdAndDelete(logId).exec();

    if (!deleted) {
      throw new NotFoundException('KM Log not found');
    }

    return { message: 'KM Log deleted successfully' };
  }
}
