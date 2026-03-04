import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  Incident,
  IncidentDocument,
} from './schemas/incident.schema';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { AwsService } from '../../aws/aws.service';
import { extname } from 'path';

@Injectable()
export class IncidentService {
  constructor(
    @InjectModel(Incident.name)
    private incidentModel: Model<IncidentDocument>,
    private readonly awsService: AwsService,
  ) {}

  async create(
    agencyId: string,
    vehicleId: string,
    dto: CreateIncidentDto,
    files?: Express.Multer.File[],
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

    // Upload photos to S3 if provided
    if (files && files.length > 0) {
      const uploadedKeys: string[] = [];

      for (const file of files) {
        const ext = extname(file.originalname).toLowerCase();
        const key = `${agencyId}/incidents/${incident._id}/${uuidv4()}${ext}`;
        await this.awsService.uploadFile(file.buffer, key, file.mimetype);
        uploadedKeys.push(key);
      }

      incident.evidencePhotos = uploadedKeys;
      await incident.save();
    }

    return incident;
  }

  async findAll(agencyId: string, vehicleId?: string) {
    const query: any = { 
      isDeleted: false,
      agencyId: new Types.ObjectId(agencyId),
    };

    if (vehicleId) query.vehicleId = new Types.ObjectId(vehicleId);

    return this.incidentModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, agencyId: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid Incident ID');

    const incident = await this.incidentModel.findOne({
      _id: new Types.ObjectId(id),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();

    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  /**
   * Get signed URLs for all evidence photos of an incident.
   */
  async getPhotos(id: string, agencyId: string): Promise<{ key: string; url: string }[]> {
    const incident = await this.findOne(id, agencyId);

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
    files: Express.Multer.File[],
  ): Promise<IncidentDocument> {
    const incident = await this.findOne(id, agencyId);

    const uploadedKeys: string[] = [];

    for (const file of files) {
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

    return incident;
  }

  /**
   * Delete a specific photo from an incident.
   */
  async deletePhoto(id: string, agencyId: string, photoKey: string): Promise<IncidentDocument> {
    const incident = await this.findOne(id, agencyId);

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

    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto, agencyId: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid Incident ID');

    const incident = await this.incidentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), agencyId: new Types.ObjectId(agencyId) },
      dto,
      { new: true },
    ).exec();

    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async remove(id: string, agencyId: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid Incident ID');

    const incident = await this.incidentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), agencyId: new Types.ObjectId(agencyId) },
      { isDeleted: true },
      { new: true },
    ).exec();

    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }
}