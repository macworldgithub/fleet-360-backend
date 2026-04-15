import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Incident,
  IncidentDocument,
  IncidentStatus,
  IncidentType,
} from './schemas/incident.schema';

import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class IncidentAlertsService {
  constructor(
    @InjectModel(Incident.name)
    private incidentModel: Model<IncidentDocument>,

    private readonly notificationService: NotificationService,
  ) {}

  // ⏰ 1. Unresolved Incident Reminder
  //   @Cron('*/10 * * * * *')
  @Cron('0 9 * * *') // production
  async unresolvedIncidentReminder() {
    const DAYS_THRESHOLD = 3;
    const now = new Date();

    const incidents = await this.incidentModel.find({
      status: { $ne: IncidentStatus.RESOLVED },
      isDeleted: false,
    });

    for (const incident of incidents) {
      const diffDays =
        (now.getTime() - new Date(incident.incidentDate).getTime()) /
        (1000 * 60 * 60 * 24);

      if (diffDays >= DAYS_THRESHOLD) {
        await this.notificationService.send({
          type: 'INCIDENT_UNRESOLVED',
          title: 'Unresolved Incident',
          message: `Incident pending for ${Math.floor(diffDays)} days`,
          vehicleId: incident.vehicleId.toString(),
          agencyId: incident.agencyId.toString(),
        });
      }
    }
  }

  // 📸 2. Missing Evidence Reminder
  //   @Cron('*/10 * * * * *')
  @Cron('0 9,18 * * *')
  async missingEvidenceReminder() {
    const incidents = await this.incidentModel.find({
      evidencePhotos: { $size: 0 },
      isDeleted: false,
    });

    for (const incident of incidents) {
      await this.notificationService.send({
        type: 'MISSING_EVIDENCE',
        title: 'Evidence Missing',
        message: `No evidence uploaded for incident`,
        vehicleId: incident.vehicleId.toString(),
        agencyId: incident.agencyId.toString(),
      });
    }
  }

  // 🚓 3. Missing Police Report Reminder
  //   @Cron('*/10 * * * * *')
  @Cron('0 11 * * *')
  async missingPoliceReportReminder() {
    const incidents = await this.incidentModel.find({
      incidentType: { $in: [IncidentType.ACCIDENT, IncidentType.THEFT] },
      policeReportNumber: null,
      isDeleted: false,
    });

    for (const incident of incidents) {
      await this.notificationService.send({
        type: 'MISSING_POLICE_REPORT',
        title: 'Police Report Required',
        message: `Police report missing for serious incident`,
        vehicleId: incident.vehicleId.toString(),
        agencyId: incident.agencyId.toString(),
      });
    }
  }

  // 🛡️ 4. Missing Insurance Claim Reminder
  //   @Cron('*/10 * * * * *')
  @Cron('0 10 * * *')
  async missingInsuranceReminder() {
    const incidents = await this.incidentModel.find({
      damageSeverity: 'HIGH',
      insuranceClaimFiled: false,
      isDeleted: false,
    });

    for (const incident of incidents) {
      await this.notificationService.send({
        type: 'INSURANCE_MISSING',
        title: 'Insurance Action Required',
        message: `Insurance claim not filed for high damage incident`,
        vehicleId: incident.vehicleId.toString(),
        agencyId: incident.agencyId.toString(),
      });
    }
  }
}
