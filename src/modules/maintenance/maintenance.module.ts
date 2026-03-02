import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { Maintenance, MaintenanceSchema } from './schemas/maintenance.schema';
import {
  LogbookSession,
  LogbookSessionSchema,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Maintenance.name, schema: MaintenanceSchema },
      { name: LogbookSession.name, schema: LogbookSessionSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
