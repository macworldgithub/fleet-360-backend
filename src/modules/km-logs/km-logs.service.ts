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
import { AwsService } from 'src/aws/aws.service';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { NotificationService } from 'src/notification/notification.service';
import { KmLogAnalyticsService } from './km-log-analytics.service';

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
    private readonly awsService: AwsService,
    private readonly notificationService: NotificationService,
    private readonly kmLogAnalyticsService: KmLogAnalyticsService,
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

  private async getLogWithSignedUrls(log: KmLogDocument) {
    const logObj = log.toObject();
    if (logObj.startOdometerPhoto) {
      logObj['startOdometerPhotoUrl'] = await this.awsService.getSignedUrl(
        logObj.startOdometerPhoto,
      );
    }
    if (logObj.endOdometerPhoto) {
      logObj['endOdometerPhotoUrl'] = await this.awsService.getSignedUrl(
        logObj.endOdometerPhoto,
      );
    }
    return logObj;
  }

  async create(
    dto: CreateKmLogDto,
    agencyId: string,
    startPhoto: Express.Multer.File,
    endPhoto: Express.Multer.File,
    role?: string,
  ) {
    this.validateObjectId(dto.vehicleId, 'vehicleId');

    const isPrincipal = role === 'PRINCIPAL';
    const filter: any = { _id: new Types.ObjectId(dto.vehicleId) };
    if (!isPrincipal) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    // 1. Validate Vehicle Status & Ownership
    const vehicle = await this.vehicleModel.findOne(filter).exec();

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in your agency');
    }

    if (dto.startOdometerInKms < vehicle.odometerInKms) {
      await this.notificationService.send({
        type: 'ODOMETER_ANOMALY',
        message: `Start odometer (${dto.startOdometerInKms}) is less than current vehicle odometer (${vehicle.odometerInKms})`,
        vehicleId: dto.vehicleId,
        agencyId,
      });
    }

    if (
      vehicle.vehicleStatus === VehicleStatus.DEACTIVATE ||
      vehicle.vehicleStatus === VehicleStatus.IN_MAINTENANCE
    ) {
      throw new BadRequestException(
        `Cannot create KM Log for vehicle in ${vehicle.vehicleStatus} status`,
      );
    }

    const distanceInKms = this.calculateDistance(
      dto.startOdometerInKms,
      dto.endOdometerInKms,
    );

    await this.kmLogAnalyticsService.checkSuspiciousDistance(
      dto.vehicleId,
      agencyId,
      distanceInKms,
    );

    if (distanceInKms > 1000) {
      await this.notificationService.send({
        type: 'SUSPICIOUS_DISTANCE',
        message: `Unusually large trip recorded: ${distanceInKms} km`,
        vehicleId: dto.vehicleId,
        agencyId,
      });
    }

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

    if (dto.tripType === TripType.BUSINESS && !dto.businessPurpose) {
      await this.notificationService.send({
        type: 'MISSING_BUSINESS_PURPOSE',
        message: 'Business trip logged without purpose',
        vehicleId: dto.vehicleId,
        agencyId,
      });
    }

    // ── 3. Upload odometer photos to S3 ──
    const startPhotoKey = await this.awsService.uploadFile(
      startPhoto.buffer,
      `${agencyId}/km-logs/${dto.vehicleId}/start-${uuid()}${path?.extname(startPhoto.originalname) || ''}`,
      startPhoto.mimetype,
    );

    const endPhotoKey = await this.awsService.uploadFile(
      endPhoto.buffer,
      `${agencyId}/km-logs/${dto.vehicleId}/end-${uuid()}${path?.extname(endPhoto.originalname) || ''}`,
      endPhoto.mimetype,
    );

    payload.startOdometerPhoto = startPhotoKey;
    payload.endOdometerPhoto = endPhotoKey;

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

    if (
      vehicle.nextServiceDueAtKm &&
      dto.endOdometerInKms >= vehicle.nextServiceDueAtKm
    ) {
      await this.notificationService.send({
        type: 'SERVICE_DUE',
        message: `Vehicle reached service threshold (${vehicle.nextServiceDueAtKm} km)`,
        vehicleId: dto.vehicleId,
        agencyId,
      });
    }

    await this.kmLogAnalyticsService.checkMaintenanceThreshold(
      dto.vehicleId,
      agencyId,
      dto.endOdometerInKms,
    );
    return log;
  }

  async findAll(filters: any, role?: string) {
    const query: any = {};
    const isPrincipal = role === 'PRINCIPAL';

    if (filters.vehicleId) {
      this.validateObjectId(filters.vehicleId, 'vehicleId');
      query.vehicleId = new Types.ObjectId(filters.vehicleId);
    }

    if (filters.officeId) {
      this.validateObjectId(filters.officeId, 'officeId');
      query.officeId = new Types.ObjectId(filters.officeId);
    }

    if (!isPrincipal) {
      if (filters.agencyId) {
        this.validateObjectId(filters.agencyId, 'agencyId');
        query.agencyId = new Types.ObjectId(filters.agencyId);
      }
    } else if (filters.agencyId) {
      // Principal can still filter by a specific agency if they want
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

    const logs = await this.kmLogModel
      .find(query)
      .sort({ tripDate: -1 })
      .exec();
    return Promise.all(logs.map((log) => this.getLogWithSignedUrls(log)));
  }

  async findOne(logId: string, agencyId: string, role?: string) {
    this.validateObjectId(logId, 'logId');

    const filter: any = { _id: new Types.ObjectId(logId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const log = await this.kmLogModel.findOne(filter).exec();

    if (!log) throw new NotFoundException('KM Log not found');

    return this.getLogWithSignedUrls(log);
  }

  async update(
    logId: string,
    dto: UpdateKmLogDto,
    agencyId: string,
    startPhoto?: Express.Multer.File,
    endPhoto?: Express.Multer.File,
    role?: string,
  ) {
    this.validateObjectId(logId, 'logId');

    const filter: any = { _id: new Types.ObjectId(logId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const existing = await this.kmLogModel.findOne(filter).exec();

    if (!existing) {
      throw new NotFoundException('KM Log not found');
    }

    const start = dto.startOdometerInKms ?? existing.startOdometerInKms;
    const end = dto.endOdometerInKms ?? existing.endOdometerInKms;

    const distanceInKms = this.calculateDistance(start, end);

    const updatePayload: any = {
      ...dto,
      tripDate: dto.tripDate ? new Date(dto.tripDate) : existing.tripDate,
      distanceInKms,
    };

    // If new start photo provided
    if (startPhoto) {
      const startPhotoKey = await this.awsService.uploadFile(
        startPhoto.buffer,
        `${agencyId}/km-logs/${existing.vehicleId}/start-${uuid()}${path.extname(startPhoto.originalname)}`,
        startPhoto.mimetype,
      );
      // Delete old photo if it exists
      if (existing.startOdometerPhoto) {
        await this.awsService.deleteFile(existing.startOdometerPhoto);
      }
      updatePayload.startOdometerPhoto = startPhotoKey;
    }

    // If new end photo provided
    if (endPhoto) {
      const endPhotoKey = await this.awsService.uploadFile(
        endPhoto.buffer,
        `${agencyId}/km-logs/${existing.vehicleId}/end-${uuid()}${path.extname(endPhoto.originalname)}`,
        endPhoto.mimetype,
      );
      // Delete old photo if it exists
      if (existing.endOdometerPhoto) {
        await this.awsService.deleteFile(existing.endOdometerPhoto);
      }
      updatePayload.endOdometerPhoto = endPhotoKey;
    }

    const updated = await this.kmLogModel
      .findOneAndUpdate(
        filter,
        {
          $set: updatePayload,
        },
        { new: true },
      )
      .exec();

    // Sync vehicle odometer if the updated log is the latest trip (optional optimization, but here we update for consistency)
    if (updated) {
      const vehicleFilter: any = { _id: updated.vehicleId };
      if (role !== 'PRINCIPAL') {
        vehicleFilter.agencyId = new Types.ObjectId(agencyId);
      }
      await this.vehicleModel
        .updateOne(vehicleFilter, {
          $set: { odometerInKms: updated.endOdometerInKms },
        })
        .exec();
    }

    if (!updated) {
      throw new NotFoundException('KM Log not found after update');
    }

    return this.getLogWithSignedUrls(updated);
  }

  async remove(logId: string, agencyId: string, role?: string) {
    this.validateObjectId(logId, 'logId');

    const filter: any = { _id: new Types.ObjectId(logId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const deleted = await this.kmLogModel.findOneAndDelete(filter).exec();

    if (!deleted) {
      throw new NotFoundException('KM Log not found');
    }

    // ── 0. Delete photos from S3 ──
    if (deleted.startOdometerPhoto) {
      await this.awsService
        .deleteFile(deleted.startOdometerPhoto)
        .catch((e) => console.error('Error deleting start photo from S3', e));
    }
    if (deleted.endOdometerPhoto) {
      await this.awsService
        .deleteFile(deleted.endOdometerPhoto)
        .catch((e) => console.error('Error deleting end photo from S3', e));
    }

    // ── 1. Revert Logbook Session Totals ──
    if (deleted.logbookSessionId) {
      const session = await this.sessionModel
        .findById(deleted.logbookSessionId)
        .exec();
      if (session && !session.isLocked) {
        // Subtract deleted distance
        session.totalKms = Math.max(
          0,
          session.totalKms - deleted.distanceInKms,
        );

        if (deleted.tripType === TripType.BUSINESS) {
          session.businessKms = Math.max(
            0,
            session.businessKms - deleted.distanceInKms,
          );
        } else {
          session.privateKms = Math.max(
            0,
            session.privateKms - deleted.distanceInKms,
          );
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
            ((session.businessKms / session.totalKms) * 100).toFixed(2),
          );
        } else {
          session.businessUsePercentage = 0;
        }

        await session.save();
      }
    }

    // ── 2. Revert Vehicle Odometer (Rollback) ──
    const latestRemainingTripFilter: any = { vehicleId: deleted.vehicleId };
    if (role !== 'PRINCIPAL') {
      latestRemainingTripFilter.agencyId = new Types.ObjectId(agencyId);
    }

    const latestRemainingTrip = await this.kmLogModel
      .findOne(latestRemainingTripFilter)
      .sort({ tripDate: -1, createdAt: -1 })
      .exec();

    if (latestRemainingTrip) {
      // Roll back vehicle odometer to the latest remaining trip's end reading
      await this.vehicleModel
        .updateOne(
          { _id: deleted.vehicleId },
          { $set: { odometerInKms: latestRemainingTrip.endOdometerInKms } },
        )
        .exec();
    } else {
      // If NO trips left, we might want to keep it as is or find a different reference.
      // For now, we leave it since we don't know the "baseline" without looking at original vehicle create odometer.
    }

    return { message: 'KM Log deleted successfully' };
  }
}
