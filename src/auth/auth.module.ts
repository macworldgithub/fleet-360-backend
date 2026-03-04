import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { DriverModule } from '../modules/drivers/driver.module';
import { AgenciesModule } from '../agencies/agencies.module';
import { AwsModule } from '../aws/aws.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    DriverModule,
    AgenciesModule,
    AwsModule,
    JwtModule.register({}), // config handled manually in service
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
