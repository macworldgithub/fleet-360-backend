import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';
import {
  FuelTransaction,
  FuelTransactionSchema,
} from './schemas/fuel-transaction.schema';
import { NotificationModule } from 'src/notification/notification.module';
import { FuelAnalyticsService } from './fuel-analytics.service';
import { FuelAlertsService } from './fuel-alerts.service';
import { VehicleModule } from '../vehicles/vehicle.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FuelTransaction.name, schema: FuelTransactionSchema },
    ]),
    NotificationModule, 
    VehicleModule,
  ],
  controllers: [FuelController],
  providers: [FuelService, FuelAnalyticsService, FuelAlertsService],
})
export class FuelModule {}