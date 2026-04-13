import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Incident, IncidentSchema } from './schemas/incident.schema';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';
import { AwsModule } from '../../aws/aws.module';
import { NotificationModule } from 'src/notification/notification.module';
import { IncidentAlertsService } from './incident-alerts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Incident.name, schema: IncidentSchema },
    ]),
    NotificationModule,
    AwsModule,
  ],
  controllers: [IncidentController],
  providers: [IncidentService, IncidentAlertsService],
})
export class IncidentModule {}
