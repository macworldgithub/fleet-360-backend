import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class VehicleAlertsService {
  constructor(
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // Runs every day at 9 AM
  @Cron('0 9 * * *')
  async registrationExpiryReminder() {
    const today = new Date();

    const vehicles = await this.vehicleModel.find({
      registrationExpiryDate: { $ne: null },
    });

    for (const vehicle of vehicles) {
      const diffDays = Math.ceil(
        (vehicle.registrationExpiryDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Trigger at 30, 7, 1 days
      if ([30, 7, 1, 0].includes(diffDays)) {
        await this.notificationService.send({
          type: 'REGISTRATION_EXPIRY',
          title: 'Registration Expiry Reminder',
          message: `Vehicle ${vehicle.registrationNumber} expires in ${diffDays} day(s).`,
          vehicleId: vehicle._id.toString(),
          agencyId: vehicle.agencyId.toString(),
        });
      }

      //  Expired
      if (diffDays < 0) {
        await this.notificationService.send({
          type: 'REGISTRATION_EXPIRED',
          title: 'Registration Expired',
          message: `Vehicle ${vehicle.registrationNumber} registration has expired!`,
          vehicleId: vehicle._id.toString(),
          agencyId: vehicle.agencyId.toString(),
        });
      }
    }
  }

  @Cron('0 9 * * *')
async scheduledServiceReminder() {
    const today = new Date();

    const vehicles = await this.vehicleModel.find({
      scheduledServiceDate: { $ne: null },
    });

    for (const vehicle of vehicles) {
      if (!vehicle.scheduledServiceDate) continue;
      const diffDays = Math.ceil(
        (vehicle.scheduledServiceDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if ([7, 1].includes(diffDays)) {
        await this.notificationService.send({
          type: 'SERVICE_REMINDER',
          title: 'Service Reminder',
          message: `Vehicle ${vehicle.registrationNumber} service in ${diffDays} day(s).`,
          vehicleId: vehicle._id.toString(),
          agencyId: vehicle.agencyId.toString(),
        });
      }

      if (diffDays < 0) {
        await this.notificationService.send({
          type: 'SERVICE_OVERDUE',
          title: 'Service Overdue',
          message: `Vehicle ${vehicle.registrationNumber} service is overdue!`,
          vehicleId: vehicle._id.toString(),
          agencyId: vehicle.agencyId.toString(),
        });
      }
    }
  }

  @Cron('0 9 1 * *') // Every 1st of month
async loanRepaymentReminder() {
    const vehicles = await this.vehicleModel.find({
      leaseType: 'LOAN',
    });

    for (const vehicle of vehicles) {
      await this.notificationService.send({
        type: 'LOAN_REMINDER',
        title: 'Loan Repayment Due',
        message: `Monthly loan payment due for vehicle ${vehicle.registrationNumber}`,
        vehicleId: vehicle._id.toString(),
        agencyId: vehicle.agencyId.toString(),
      });
    }
  }
}
