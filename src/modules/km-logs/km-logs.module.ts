import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KmLogsController } from './km-logs.controller';
import { KmLogsService } from './km-logs.service';
import { KmLog, KmLogSchema } from './schemas/km-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: KmLog.name, schema: KmLogSchema }]),
  ],
  controllers: [KmLogsController],
  providers: [KmLogsService],
  exports: [KmLogsService],
})
export class KmLogsModule {}
