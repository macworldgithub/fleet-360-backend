import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { KmLog, KmLogDocument } from "./schemas/km-log.schema";
import { Vehicle, VehicleDocument } from "../vehicles/schemas/vehicle.schema";
import { NotificationService } from "src/notification/notification.service";
import { Model } from "mongoose";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class KmLogReminderService {
  constructor(
    @InjectModel(KmLog.name)
    private kmLogModel: Model<KmLogDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 9 * * *') // every day at 9 AM
  async checkMissingLogs() {
    const vehicles = await this.vehicleModel.find({
      vehicleStatus: 'ACTIVE',
    });

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    for (const vehicle of vehicles) {
      const lastLog = await this.kmLogModel
        .findOne({ vehicleId: vehicle._id })
        .sort({ tripDate: -1 });

      if (!lastLog || lastLog.tripDate < twoDaysAgo) {
        await this.notificationService.send({
          type: 'MISSING_KM_LOG',
          message: `No trips logged for vehicle in last 2 days`,
          vehicleId: vehicle._id.toString(),
          agencyId: vehicle.agencyId?.toString(),
        });
      }
    }
  }
}