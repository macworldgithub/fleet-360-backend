import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LogbookSessionAtoComplianceController } from './logbook-session-ato-compliance.controller';
import { LogbookSessionAtoComplianceService } from './logbook-session-ato-compliance.service';
import {
  LogbookSession,
  LogbookSessionSchema,
} from './schemas/logbook-session.schema';
import { KmLog, KmLogSchema } from '../km-logs/schemas/km-log.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LogbookSession.name, schema: LogbookSessionSchema },
      { name: KmLog.name, schema: KmLogSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
  ],
  controllers: [LogbookSessionAtoComplianceController],
  providers: [LogbookSessionAtoComplianceService],
  exports: [LogbookSessionAtoComplianceService],
})
export class LogbookSessionAtoComplianceModule {}
