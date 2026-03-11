import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AgencyAuthService } from './agency-auth.service';
import { AgencyAuthController } from './agency-auth.controller';
import { AgenciesModule } from '../agencies/agencies.module';

@Module({
  imports: [AgenciesModule, JwtModule],
  providers: [AgencyAuthService],
  controllers: [AgencyAuthController],
})
export class AgencyAuthModule {}
