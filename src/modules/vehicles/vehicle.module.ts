import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { VehicleService } from './vehicle.service';
import { VehicleController } from './vehicle.controller';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AgenciesModule } from '../../agencies/agencies.module';
import { LogbookSessionAtoComplianceModule } from '../logbooksession-ato-compliance/logbook-session-ato-compliance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
    forwardRef(() => MaintenanceModule),
    AgenciesModule,
    LogbookSessionAtoComplianceModule,
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
