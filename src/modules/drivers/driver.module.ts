import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Driver, DriverSchema } from './schemas/driver.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Driver.name, schema: DriverSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
  ],
  controllers: [DriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
