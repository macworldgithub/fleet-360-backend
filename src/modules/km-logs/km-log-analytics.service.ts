import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KmLog, KmLogDocument, TripType } from './schemas/km-log.schema';
import {
  LogbookSession,
  LogbookSessionDocument,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { NotificationService } from 'src/notification/notification.service';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';

@Injectable()
export class KmLogAnalyticsService {
  private readonly logger = new Logger(KmLogAnalyticsService.name);

  constructor(
    @InjectModel(KmLog.name)
    private kmLogModel: Model<KmLogDocument>,

    @InjectModel(LogbookSession.name)
    private sessionModel: Model<LogbookSessionDocument>,

    private readonly notificationService: NotificationService,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
  ) {}

  /** WEEKLY KM SUMMARY */
  @Cron('0 8 * * 1') // Every Monday at 8 AM
  async weeklySummary() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const logs = await this.kmLogModel.find({
      tripDate: { $gte: oneWeekAgo },
    });

    const summaryMap = new Map<string, any>();

    for (const log of logs) {
      const vehicleId = log.vehicleId.toString();
      if (!summaryMap.has(vehicleId)) {
        summaryMap.set(vehicleId, {
          total: 0,
          business: 0,
          private: 0,
          agencyId: log.agencyId?.toString(),
        });
      }

      const data = summaryMap.get(vehicleId);
      data.total += log.distanceInKms;
      if (log.tripType === TripType.BUSINESS)
        data.business += log.distanceInKms;
      else data.private += log.distanceInKms;
    }

    for (const [vehicleId, data] of summaryMap.entries()) {
      await this.notificationService.send({
        type: 'WEEKLY_SUMMARY',
        message: `Weekly KM Summary:
Total: ${data.total} km
Business: ${data.business} km
Private: ${data.private} km`,
        vehicleId,
        agencyId: data.agencyId,
      });
    }
  }

  /** LOGBOOK SESSION INACTIVITY ALERT */
  @Cron('0 10 * * *') // Daily at 10 AM
  async logbookInactivityCheck() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // 3-day inactivity

    const inactiveSessions = await this.sessionModel.find({
      isLocked: false,
      updatedAt: { $lt: threeDaysAgo },
    });

    for (const session of inactiveSessions) {
      await this.notificationService.send({
        type: 'LOGBOOK_INACTIVE',
        message: `Your logbook session for vehicle ${session.vehicleId.toString()} has been inactive for more than 3 days. Please add trips to maintain compliance.`,
        vehicleId: session.vehicleId.toString(),
        agencyId: session.agencyId?.toString(),
      });
    }
  }

  /** SUSPICIOUS DISTANCE ALERT */
  async checkSuspiciousDistance(
    vehicleId: string,
    agencyId: string,
    distanceInKms: number,
  ) {
    // Threshold: e.g., 5x typical daily distance or configurable
    const suspiciousThreshold = 500; // km (example, adjust per your fleet norms)

    if (distanceInKms > suspiciousThreshold) {
      this.logger.warn(
        `Suspicious distance detected for vehicle ${vehicleId}: ${distanceInKms} km`,
      );

      await this.notificationService.send({
        type: 'SUSPICIOUS_DISTANCE',
        message: `Trip distance of ${distanceInKms} km for vehicle ${vehicleId} seems unusually high. Please verify.`,
        vehicleId,
        agencyId,
      });
    }
  }

  @Cron('0 9 * * *') // Every day at 9 AM
  async checkInactiveVehicles() {
    const DAYS_INACTIVE = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_INACTIVE);

    const inactiveVehicles = await this.kmLogModel.aggregate([
      {
        $group: {
          _id: '$vehicleId',
          lastTrip: { $max: '$tripDate' },
          agencyId: { $first: '$agencyId' },
        },
      },
      {
        $match: {
          lastTrip: { $lte: cutoffDate },
        },
      },
    ]);

    for (const v of inactiveVehicles) {
      await this.notificationService.send({
        type: 'INACTIVITY_ALERT',
        message: `⚠️ Vehicle ${v._id} has no KM logs for ${DAYS_INACTIVE} days.`,
        vehicleId: v._id.toString(),
        agencyId: v.agencyId?.toString(),
      });
    }
  }
  async checkMaintenanceThreshold(
    vehicleId: string,
    agencyId: string,
    currentKm: number,
  ) {
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle?.nextServiceDueAtKm) return;

    const remainingKm = vehicle.nextServiceDueAtKm - currentKm;

    if (remainingKm <= 100 && remainingKm > 0) {
      await this.notificationService.send({
        type: 'MAINTENANCE_REMINDER',
        message: `🛠️ Vehicle ${vehicleId} is due for maintenance in ${remainingKm} km.`,
        vehicleId,
        agencyId,
      });
    }
  }
}
