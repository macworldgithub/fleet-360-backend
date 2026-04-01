import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver, DriverDocument } from './schemas/driver.schema';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class LicenseCronService {
  constructor(
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
    private readonly notificationService: NotificationService,
  ) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
//   @Cron('*/10 * * * * *')
  async checkLicenseExpiry() {
    console.log('Running License Expiry Check...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    //  Drivers expiring TODAY
    const expiringToday = await this.driverModel.find({
      licenseExpiryDate: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    //  Drivers expiring in 7 days
    const expiringInWeek = await this.driverModel.find({
      licenseExpiryDate: {
        $gte: nextWeek,
        $lt: new Date(nextWeek.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    // Notify TODAY expiry
    for (const driver of expiringToday) {
      await this.notificationService.sendToDriver({
        driverId: driver._id.toString(),
        title: 'License Expired',
        message:
          'Your driving license expires today. Please renew immediately.',
        type: 'LICENSE_EXPIRED',
        meta: {
          expiryDate: driver.licenseExpiryDate.toISOString(),
        },
      });
    }

    //  Notify 7 days before
    for (const driver of expiringInWeek) {
      await this.notificationService.sendToDriver({
        driverId: driver._id.toString(),
        title: 'License Expiry Reminder',
        message: 'Your driving license will expire in 7 days.',
        type: 'LICENSE_EXPIRING_SOON',
        meta: {
          expiryDate: driver.licenseExpiryDate.toISOString(),
        },
      });
    }
  }
}
