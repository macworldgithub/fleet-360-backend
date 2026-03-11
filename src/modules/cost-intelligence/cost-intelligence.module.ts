import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CostIntelligenceController } from './cost-intelligence.controller';
import { CostIntelligenceService } from './cost-intelligence.service';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { FuelTransaction, FuelTransactionSchema } from '../fuel/schemas/fuel-transaction.schema';
import { Maintenance, MaintenanceSchema } from '../maintenance/schemas/maintenance.schema';
import { Incident, IncidentSchema } from '../incidents/schemas/incident.schema';
import { KmLog, KmLogSchema } from '../km-logs/schemas/km-log.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: FuelTransaction.name, schema: FuelTransactionSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
      { name: Incident.name, schema: IncidentSchema },
      { name: KmLog.name, schema: KmLogSchema },
    ]),
  ],
  controllers: [CostIntelligenceController],
  providers: [CostIntelligenceService],
})
export class CostIntelligenceModule {}