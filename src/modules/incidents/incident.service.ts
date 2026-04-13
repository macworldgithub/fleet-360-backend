import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Incident, IncidentDocument } from './schemas/incident.schema';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { AwsService } from '../../aws/aws.service';
import { extname } from 'path';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class IncidentService {
  constructor(
    @InjectModel(Incident.name)
    private incidentModel: Model<IncidentDocument>,
    private readonly awsService: AwsService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    agencyId: string,
    vehicleId: string,
    dto: CreateIncidentDto,
    evidencePhotos?: Express.Multer.File[],
  ) {
    if (!Types.ObjectId.isValid(agencyId))
      throw new BadRequestException('Invalid agencyId');

    if (!Types.ObjectId.isValid(vehicleId))
      throw new BadRequestException('Invalid vehicleId');

    const incident = await this.incidentModel.create({
      agencyId: new Types.ObjectId(agencyId),
      vehicleId: new Types.ObjectId(vehicleId),
      incidentType: dto.incidentType,
      incidentDate: new Date(dto.incidentDate),
      location: dto.location,
      description: dto.description,
      damageSeverity: dto.damageSeverity ?? null,
      estimatedRepairCost: dto.estimatedRepairCost ?? null,
      insuranceClaimFiled: dto.insuranceClaimFiled ?? false,
      policeReportNumber: dto.policeReportNumber ?? null,
      evidencePhotos: [],
      isDeleted: false,
    });

    await this.notificationService.send({
      type: 'INCIDENT_REPORTED',
      title: 'Incident Reported',
      message: `${dto.incidentType} reported at ${dto.location}`,
      vehicleId,
      agencyId,
    });

    if (dto.damageSeverity === 'HIGH') {
      await this.notificationService.send({
        type: 'HIGH_DAMAGE',
        title: 'High Damage Alert',
        message: `High severity damage reported`,
        vehicleId,
        agencyId,
      });
    }

    const HIGH_COST_THRESHOLD = 5000;

    if (
      dto.estimatedRepairCost &&
      dto.estimatedRepairCost > HIGH_COST_THRESHOLD
    ) {
      await this.notificationService.send({
        type: 'HIGH_REPAIR_COST',
        title: 'High Repair Cost',
        message: `Estimated repair cost: ${dto.estimatedRepairCost}`,
        vehicleId,
        agencyId,
      });
    }

    if (dto.policeReportNumber) {
      await this.notificationService.send({
        type: 'POLICE_REPORT',
        title: 'Police Report Filed',
        message: `Police report number: ${dto.policeReportNumber}`,
        vehicleId,
        agencyId,
      });
    }

    if (dto.insuranceClaimFiled) {
      await this.notificationService.send({
        type: 'INSURANCE_CLAIM',
        title: 'Insurance Claim Filed',
        message: `Insurance claim has been filed`,
        vehicleId,
        agencyId,
      });
    }
    // Upload photos to S3 if provided
    if (evidencePhotos && evidencePhotos.length > 0) {
      const uploadedKeys: string[] = [];

      for (const file of evidencePhotos) {
        const ext = extname(file.originalname).toLowerCase();
        const key = `${agencyId}/incidents/${incident._id}/${uuidv4()}${ext}`;
        await this.awsService.uploadFile(file.buffer, key, file.mimetype);
        uploadedKeys.push(key);
      }

      incident.evidencePhotos = uploadedKeys;
      await incident.save();
    }

    return this.attachPhotoUrls(incident);
  }

  private async attachPhotoUrls(incident: IncidentDocument): Promise<any> {
    const obj = incident.toObject();
    if (obj.evidencePhotos && obj.evidencePhotos.length > 0) {
      obj['evidencePhotoUrls'] = await Promise.all(
        obj.evidencePhotos.map((key) => this.awsService.getSignedUrl(key)),
      );
    } else {
      obj['evidencePhotoUrls'] = [];
    }
    return obj;
  }

  async findAll(agencyId: string, vehicleId?: string, role?: string) {
    const isPrincipal = role === 'PRINCIPAL';
    const query: any = {
      isDeleted: false,
    };

    if (!isPrincipal) {
      query.agencyId = new Types.ObjectId(agencyId);
    }

    if (vehicleId) query.vehicleId = new Types.ObjectId(vehicleId);

    const incidents = await this.incidentModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    return Promise.all(
      incidents.map((incident) => this.attachPhotoUrls(incident)),
    );
  }

  async getOne(id: string, agencyId: string, role?: string) {
    const incident = await this.findOne(id, agencyId, role);
    return this.attachPhotoUrls(incident);
  }

  async findOne(id: string, agencyId: string, role?: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid Incident ID');

    const filter: any = { _id: new Types.ObjectId(id) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const incident = await this.incidentModel.findOne(filter).exec();

    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  /**
   * Get signed URLs for all evidence photos of an incident.
   */
  async getPhotos(
    id: string,
    agencyId: string,
    role?: string,
  ): Promise<{ key: string; url: string }[]> {
    const incident = await this.findOne(id, agencyId, role);

    if (!incident.evidencePhotos || incident.evidencePhotos.length === 0) {
      return [];
    }

    const photos = await Promise.all(
      incident.evidencePhotos.map(async (key) => ({
        key,
        url: await this.awsService.getSignedUrl(key),
      })),
    );

    return photos;
  }

  /**
   * Upload additional photos to an existing incident.
   */
  async addPhotos(
    id: string,
    agencyId: string,
    evidencePhotos: Express.Multer.File[],
    role?: string,
  ): Promise<any> {
    const incident = await this.findOne(id, agencyId, role);

    const uploadedKeys: string[] = [];

    for (const file of evidencePhotos) {
      const ext = extname(file.originalname).toLowerCase();
      const key = `${agencyId}/incidents/${incident._id}/${uuidv4()}${ext}`;
      await this.awsService.uploadFile(file.buffer, key, file.mimetype);
      uploadedKeys.push(key);
    }

    incident.evidencePhotos = [
      ...(incident.evidencePhotos || []),
      ...uploadedKeys,
    ];
    await incident.save();

    return this.attachPhotoUrls(incident);
  }

  /**
   * Delete a specific photo from an incident.
   */
  async deletePhoto(
    id: string,
    agencyId: string,
    photoKey: string,
    role?: string,
  ): Promise<any> {
    const incident = await this.findOne(id, agencyId, role);

    if (!incident.evidencePhotos?.includes(photoKey)) {
      throw new NotFoundException('Photo not found on this incident');
    }

    // Delete from S3
    await this.awsService.deleteFile(photoKey);

    // Remove key from array
    incident.evidencePhotos = incident.evidencePhotos.filter(
      (key) => key !== photoKey,
    );
    await incident.save();

    return this.attachPhotoUrls(incident);
  }

  async update(
    id: string,
    dto: UpdateIncidentDto,
    agencyId: string,
    role?: string,
  ) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid Incident ID');

    const filter: any = { _id: new Types.ObjectId(id) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const existing = await this.incidentModel.findOne(filter).exec();
    if (!existing) throw new NotFoundException('Incident not found');

    const incident = await this.incidentModel
      .findOneAndUpdate(filter, dto, { new: true })
      .exec();

    if (dto.status && dto.status !== existing.status) {
      await this.notificationService.send({
        type: 'INCIDENT_STATUS_UPDATED',
        title: 'Incident Status Updated',
        message: `Status changed to ${dto.status}`,
        vehicleId: incident?.vehicleId.toString(),
        agencyId: incident?.agencyId.toString(),
      });
    }

    if (!incident) throw new NotFoundException('Incident not found');
    return this.attachPhotoUrls(incident);
  }

  async remove(id: string, agencyId: string, role?: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid Incident ID');

    const filter: any = { _id: new Types.ObjectId(id) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const incident = await this.incidentModel
      .findOneAndUpdate(filter, { isDeleted: true }, { new: true })
      .exec();

    if (!incident) throw new NotFoundException('Incident not found');
    return this.attachPhotoUrls(incident);
  }
}
