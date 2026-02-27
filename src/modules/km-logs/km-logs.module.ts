import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KmLogsController } from './km-logs.controller';
import { KmLogsService } from './km-logs.service';
import { KmLog, KmLogSchema } from './schemas/km-log.schema';

import {
  LogbookSession,
  LogbookSessionSchema,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KmLog.name, schema: KmLogSchema },
      { name: LogbookSession.name, schema: LogbookSessionSchema },
    ]),
    MaintenanceModule,
  ],
  controllers: [KmLogsController],
  providers: [KmLogsService],
  exports: [KmLogsService],
})
export class KmLogsModule {}
