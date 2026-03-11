import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { Maintenance, MaintenanceSchema } from '../maintenance/schemas/maintenance.schema';
import { LogbookSession, LogbookSessionSchema } from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { Agency, AgencySchema } from '../../agencies/schemas/agency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
      { name: LogbookSession.name, schema: LogbookSessionSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Agency.name, schema: AgencySchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
