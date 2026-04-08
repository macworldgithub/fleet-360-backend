import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NotificationService } from 'src/notification/notification.service';
import {
  FuelTransaction,
  FuelTransactionDocument,
} from './schemas/fuel-transaction.schema';

@Injectable()
export class FuelAnalyticsService {
  constructor(
    @InjectModel(FuelTransaction.name)
    private fuelModel: Model<FuelTransactionDocument>,

    private readonly notificationService: NotificationService,
  ) {}

  async checkFuelAnomalies(
    vehicleId: string,
    agencyId: string,
    currentFuel: FuelTransactionDocument,
  ) {
    // Get last transaction
    const lastFuel = await this.fuelModel
      .findOne({
        vehicleId: currentFuel.vehicleId,
        _id: { $ne: currentFuel._id },
      })
      .sort({ fuelDate: -1 });

    if (!lastFuel) return;

    // ODOMETER ROLLBACK
    if (
      currentFuel.odometer &&
      lastFuel.odometer &&
      currentFuel.odometer < lastFuel.odometer
    ) {
      await this.notificationService.send({
        type: 'ODOMETER_ROLLBACK',
        title: 'Odometer Alert',
        message: `Odometer rollback detected for vehicle`,
        vehicleId,
        agencyId,
      });
    }

    // SUSPICIOUS FUEL CONSUMPTION
    if (currentFuel.odometer && lastFuel.odometer && currentFuel.liters) {
      const kmDriven = currentFuel.odometer - lastFuel.odometer;
      const avg = kmDriven / currentFuel.liters;

      // Example threshold: less than 3 km/l = suspicious
      if (avg < 3) {
        await this.notificationService.send({
          type: 'SUSPICIOUS_FUEL_USAGE',
          title: 'Fuel Alert',
          message: `Suspicious fuel consumption detected (Avg: ${avg.toFixed(2)} km/L)`,
          vehicleId,
          agencyId,
        });
      }
    }

    // TOO FREQUENT FUELING
    const timeDiff =
      new Date(currentFuel.fuelDate).getTime() -
      new Date(lastFuel.fuelDate).getTime();

    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // Ignore unrealistic quick entries (testing / duplicate)
    if (hoursDiff < 0.1) return;

    // Real frequent fueling
    if (hoursDiff < 2) {
      await this.notificationService.send({
        type: 'FREQUENT_FUELING',
        title: 'Fuel Alert',
        message: `Fuel added again within ${hoursDiff.toFixed(1)} hours`,
        vehicleId,
        agencyId,
      });
    }
  }
}
