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
    photos: Express.Multer.File[],
  ) {
    if (!Types.ObjectId.isValid(agencyId))
      throw new BadRequestException('Invalid agencyId');

    if (!Types.ObjectId.isValid(vehicleId))
      throw new BadRequestException('Invalid vehicleId');

    const photoPaths = photos?.map((file) => file.path) || [];

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
      evidencePhotos: photoPaths,
      isDeleted: false,
    });
  }

  async findAll(filters: any) {
    const query: any = { isDeleted: false };

    if (filters.agencyId) query.agencyId = filters.agencyId;
    if (filters.vehicleId) query.vehicleId = filters.vehicleId;

    return this.incidentModel.find(query).sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const incident = await this.incidentModel.findById(id);
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto) {
    const incident = await this.incidentModel.findByIdAndUpdate(
      id,
      dto,
      { new: true },
    );

    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async remove(id: string) {
    const incident = await this.incidentModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );

    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }
}