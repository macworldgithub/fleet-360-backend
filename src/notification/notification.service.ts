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
import {
  Vehicle,
  VehicleDocument,
} from 'src/modules/vehicles/schemas/vehicle.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,

    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,

    private readonly firebaseService: FirebaseService,
    private readonly gateway: NotificationsGateway,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
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

  async send({
    type,
    message,
    vehicleId,
    agencyId,
    driverId,
    title,
    meta,
  }: {
    type: string;
    message: string;
    vehicleId?: string;
    agencyId?: string;
    driverId?: string;
    title?: string;
    meta?: any;
  }) {
    const finalTitle = title || type.replace(/_/g, ' ');
    const payloadMeta = { vehicleId, ...meta };

    console.log(finalTitle, '34343');

    let resolvedDriverId = driverId;

    // ✅ AUTO-FETCH DRIVER FROM VEHICLE
    if (!resolvedDriverId && vehicleId) {
      const vehicle = await this.vehicleModel.findById(vehicleId);
      resolvedDriverId = vehicle?.currentDriverId?.toString();
    }

    // ✅ ALWAYS send to driver if exists
    if (resolvedDriverId) {
      await this.sendToDriver({
        driverId: resolvedDriverId,
        title: finalTitle,
        message,
        type,
        meta: payloadMeta,
      });
    }

    // ✅ ALSO notify admins (optional but recommended)
    if (agencyId) {
      await this.notifyAdmins({
        agencyId,
        title: finalTitle,
        message,
        type,
        meta: payloadMeta,
      });
    }

    // ✅ Always save fallback
    return this.createNotification({
      title: finalTitle,
      message,
      agencyId,
      type,
      meta: payloadMeta,
      target: resolvedDriverId ? 'DRIVER' : 'ADMIN',
    });
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
      target: 'ADMIN',
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
