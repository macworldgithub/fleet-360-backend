import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  FuelTransaction,
  FuelTransactionDocument,
} from './schemas/fuel-transaction.schema';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class FuelAlertsService {
  constructor(
    @InjectModel(FuelTransaction.name)
    private fuelModel: Model<FuelTransactionDocument>,

    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,

    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 9 * * *') // production
  async noFuelActivityReminder() {
    const DAYS_THRESHOLD = 5;
    const now = new Date();

    const vehicles = await this.vehicleModel.find({
      agencyId: { $exists: true },
    });

    for (const vehicle of vehicles) {
      const lastFuel = await this.fuelModel
        .findOne({ vehicleId: vehicle._id })
        .sort({ fuelDate: -1 });

      if (!lastFuel) continue;

      const diffDays =
        (now.getTime() - new Date(lastFuel.fuelDate).getTime()) /
        (1000 * 60 * 60 * 24);
      console.log(
        'Vehicle:',
        vehicle.registrationNumber,
        'diffDays:',
        diffDays,
      );
      if (diffDays >= DAYS_THRESHOLD) {
        if (!vehicle.agencyId || !vehicle._id) {
          console.log('Skipping vehicle due to missing data:', vehicle);
          continue;
        }

        await this.notificationService.send({
          type: 'NO_FUEL_ACTIVITY',
          title: 'Fuel Reminder',
          message: `No fuel activity for vehicle ${vehicle.registrationNumber} in last ${DAYS_THRESHOLD} days`,
          vehicleId: vehicle._id.toString(),
          agencyId: vehicle.agencyId.toString(),
        });
      }
    }
  }

  // 💸 Monthly fuel budget
  @Cron('0 9 * * *') // production
  async monthlyFuelBudgetAlert() {
    const BUDGET_LIMIT = 50000; // adjust
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const vehicles = await this.vehicleModel.find({
      agencyId: { $exists: true },
    });

    for (const vehicle of vehicles) {
      const fuelLogs = await this.fuelModel.find({
        vehicleId: vehicle._id,
        fuelDate: { $gte: startOfMonth },
      });

      const totalSpent = fuelLogs.reduce((sum, f) => sum + f.totalCost, 0);

      if (totalSpent > BUDGET_LIMIT) {
        if (!vehicle.agencyId || !vehicle._id) {
          console.log('Skipping vehicle due to missing data:', vehicle);
          continue;
        }

        await this.notificationService.send({
          type: 'FUEL_BUDGET_EXCEEDED',
          title: 'Fuel Budget Alert',
          message: `Fuel budget exceeded: ${totalSpent}`,
          vehicleId: vehicle._id.toString(),
          agencyId: vehicle.agencyId.toString(),
        });
      }
    }
  }
}
