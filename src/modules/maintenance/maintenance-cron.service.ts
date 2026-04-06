import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';
import {
  LogbookSession,
  LogbookSessionDocument,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class MaintenanceCronService {
  private readonly logger = new Logger(MaintenanceCronService.name);

  constructor(
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,

    @InjectModel(LogbookSession.name)
    private logbookModel: Model<LogbookSessionDocument>,

    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
//   @Cron('*/30 * * * * *')
  async checkServiceDue() {
    this.logger.log('Checking vehicles nearing service...');

    const vehicles = await this.vehicleModel.find({
      nextServiceDueAtKm: { $ne: null },
    });

    for (const vehicle of vehicles) {
      if (!vehicle.nextServiceDueAtKm) continue;

      const latestSession = await this.logbookModel
        .findOne({ vehicleId: vehicle._id })
        .sort({ startDate: -1 });

      if (!latestSession?.endOdometerInKms) continue;

      const currentKm = latestSession.endOdometerInKms;
      const remainingKm = vehicle.nextServiceDueAtKm - currentKm;

      // CONDITION: within 1000 KM
      if (remainingKm <= 1000 && remainingKm > 0) {
        this.logger.log(
          `Vehicle ${vehicle._id} nearing service: ${remainingKm} KM left`,
        );

        // Prevent duplicate notifications
        if (vehicle['serviceAlertSent']) continue;

        // Notify Admin
        await this.notificationService.notifyAdmins({
          agencyId: vehicle.agencyId.toString(),
          title: 'Service Due Soon',
          message: `Vehicle is due for service in ${remainingKm} KM`,
          type: 'SERVICE_DUE_SOON',
          meta: {
            vehicleId: vehicle._id,
            remainingKm,
          },
        });

        // Notify Driver
        if (vehicle.currentDriverId) {
          await this.notificationService.sendToDriver({
            driverId: vehicle.currentDriverId.toString(),
            title: 'Service Reminder',
            message: `Your vehicle needs service in ${remainingKm} KM`,
            type: 'SERVICE_DUE_SOON',
            meta: {
              vehicleId: vehicle._id,
            },
          });
        }

        // Mark as sent (avoid spam)
        await this.vehicleModel.findByIdAndUpdate(vehicle._id, {
          $set: { serviceAlertSent: true },
        });
      }
    }
  }
}
