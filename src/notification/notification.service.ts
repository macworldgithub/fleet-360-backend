import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NotificationsGateway } from './notification.gateway';
import { FirebaseService } from '../firebase/firebase.service';
import {
  Driver,
  DriverDocument,
} from 'src/modules/drivers/schemas/driver.schema';
import { Notification, NotificationDocument } from './notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,

    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,

    private readonly firebaseService: FirebaseService,
    private readonly gateway: NotificationsGateway,
  ) {}

  // CREATE NOTIFICATION RECORD
  async createNotification(data: {
    title: string;
    message: string;
    userId?: string;
    agencyId?: string;
    type: string;
    meta?: any;
    target: 'DRIVER' | 'ADMIN';
  }) {
    return this.notificationModel.create(data);
  }

  // 📱 SEND TO DRIVER (FCM)
  async sendToDriver({
    driverId,
    title,
    message,
    type,
    meta,
  }: {
    driverId: string;
    title: string;
    message: string;
    type: string;
    meta?: any;
  }) {
    const driver = await this.driverModel.findById(driverId);
    if (!driver) return;

    // Save notification in DB
    await this.createNotification({
      title,
      message,
      userId: driverId,
      agencyId: driver.agencyId.toString(),
      type,
      meta,
      target: 'DRIVER', // ✅ required
    });

    // Send Push Notification only if tokens exist
    if (driver.deviceTokens?.length) {
      await this.firebaseService.sendPush(driver.deviceTokens, title, message, {
        type,
        ...meta,
      });
    }
  }

  // 🌐 SEND TO ADMIN (WEBSOCKET)
  async notifyAdmins({
    agencyId,
    title,
    message,
    type,
    meta,
  }: {
    agencyId: string;
    title: string;
    message: string;
    type: string;
    meta?: any;
  }) {
    // 1. Save in DB (optional: per admin later)
    await this.createNotification({
      title,
      message,
      agencyId,
      type,
      meta,
      target: 'ADMIN'
    });

    // 2. Emit via WebSocket
    this.gateway.broadcast('admin_notification', {
      agencyId,
      title,
      message,
      type,
      meta,
    });
  }
}
