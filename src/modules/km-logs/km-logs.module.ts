import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KmLogsController } from './km-logs.controller';
import { KmLogsService } from './km-logs.service';
import { KmLog, KmLogSchema } from './schemas/km-log.schema';
import {
  Vehicle,
  VehicleSchema,
} from '../vehicles/schemas/vehicle.schema';
import {
  LogbookSession,
  LogbookSessionSchema,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AwsModule } from 'src/aws/aws.module';
import { NotificationModule } from 'src/notification/notification.module';
import { KmLogReminderService } from './km-logs-cron.service';
import { KmLogAnalyticsService } from './km-log-analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KmLog.name, schema: KmLogSchema },
      { name: LogbookSession.name, schema: LogbookSessionSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
    MaintenanceModule,
    AwsModule,
    NotificationModule, 
  ],
  controllers: [KmLogsController],
  providers: [KmLogsService, KmLogReminderService, KmLogAnalyticsService],
  exports: [KmLogsService],
})
export class KmLogsModule {}
