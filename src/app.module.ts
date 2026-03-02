import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AgenciesModule } from './agencies/agencies.module';
import { AgencyAuthModule } from './agency-auth/agency-auth.module';
import { VehicleModule } from './modules/vehicles/vehicle.module';
import { OfficesModule } from './offices/dto/offices.module';
import { DriverModule } from './modules/drivers/driver.module';
import { KmLogsModule } from './modules/km-logs/km-logs.module';
import { LogbookSessionAtoComplianceModule } from './modules/logbooksession-ato-compliance/logbook-session-ato-compliance.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { IncidentModule } from './modules/incidents/incident.module';
import { AwsModule } from './aws/aws.module';
import { FuelModule } from './modules/fuel/fuel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),

    AuthModule,
    AgencyAuthModule,
    AgenciesModule,
    UsersModule,
    VehicleModule,
    OfficesModule,
    DriverModule,
    KmLogsModule,
    LogbookSessionAtoComplianceModule,
    MaintenanceModule,
    IncidentModule,
    FuelModule,
    AwsModule,
  ],
})
export class AppModule {}
