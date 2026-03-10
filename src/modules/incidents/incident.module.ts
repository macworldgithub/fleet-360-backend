import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Incident, IncidentSchema } from './schemas/incident.schema';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';
import { AwsModule } from '../../aws/aws.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Incident.name, schema: IncidentSchema },
    ]),
    AwsModule,
  ],
  controllers: [IncidentController],
  providers: [IncidentService],
})
export class IncidentModule {}
