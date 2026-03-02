import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Incident,
  IncidentDocument,
} from './schemas/incident.schema';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

@Injectable()
export class IncidentService {
  constructor(
    @InjectModel(Incident.name)
    private incidentModel: Model<IncidentDocument>,
  ) {}

  async create(
    agencyId: string,
    vehicleId: string,
    dto: CreateIncidentDto,
    // photos: any[],
  ) {
    if (!Types.ObjectId.isValid(agencyId))
      throw new BadRequestException('Invalid agencyId');

    if (!Types.ObjectId.isValid(vehicleId))
      throw new BadRequestException('Invalid vehicleId');

    // const photoPaths = photos?.map((file) => file.path) || [];

    return this.incidentModel.create({
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
      // evidencePhotos: dto.evidencePhotos ?? [], 
      isDeleted: false,
    });
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