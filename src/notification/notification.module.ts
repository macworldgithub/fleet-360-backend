import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NotificationsGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

import { FirebaseModule } from '../firebase/firebase.module';
import { Driver, DriverSchema } from 'src/modules/drivers/schemas/driver.schema';
import { Notification, NotificationSchema } from './notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
    FirebaseModule,
  ],
  providers: [NotificationsGateway, NotificationService],
  exports: [NotificationService], // IMPORTANT
})
export class NotificationModule {}