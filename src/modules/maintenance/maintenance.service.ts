import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Maintenance,
  MaintenanceDocument,
  MaintenanceStatus,
} from './schemas/maintenance.schema';
import {
  LogbookSession,
  LogbookSessionDocument,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import {
  Vehicle,
  VehicleDocument,
  VehicleStatus,
} from '../vehicles/schemas/vehicle.schema';
import { CreateMaintenanceDto } from './dtos/create-maintenance.dto';
import { AgencyRole } from '../../agencies/schemas/agency.schema';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(Maintenance.name)
    private maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(LogbookSession.name)
    private logbookSessionModel: Model<LogbookSessionDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
  ) {}

  private validateObjectId(id: string, label = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  // ===================== CREATE =====================

  async create(
    dto: CreateMaintenanceDto,
    userId: string,
    agencyId: string,
  ): Promise<MaintenanceDocument> {
    this.validateObjectId(dto.vehicleId, 'vehicleId');

    // Find latest logbook session for the vehicle
    const latestSession = await this.logbookSessionModel
      .findOne({ vehicleId: new Types.ObjectId(dto.vehicleId) })
      .sort({ startDate: -1 })
      .exec();

    if (!latestSession) {
      throw new NotFoundException(
        `No logbook session found for vehicle ${dto.vehicleId}`,
      );
    }

    const maintenance = new this.maintenanceModel({
      vehicleId: new Types.ObjectId(dto.vehicleId),
      agencyId: new Types.ObjectId(agencyId),
      maintenanceType: dto.maintenanceType,
      description: dto.description || null,
      odometerAtRequest: latestSession.endOdometerInKms,
      estimatedCost: dto.estimatedCost || null,
      status: MaintenanceStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return maintenance.save();
  }

  // ===================== SUBMIT =====================

  async submit(
    id: string,
    userId: string,
  ): Promise<MaintenanceDocument> {
    this.validateObjectId(id, 'Maintenance ID');

    const maintenance = await this.maintenanceModel.findById(id).exec();
    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }

    // Only the creator can submit
    if (maintenance.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only the creator can submit this maintenance request');
    }

    // Only DRAFT can move to SUBMITTED
    if (maintenance.status !== MaintenanceStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot submit maintenance in ${maintenance.status} status. Only DRAFT can be submitted.`,
      );
    }

    maintenance.status = MaintenanceStatus.SUBMITTED;
    maintenance.submittedBy = new Types.ObjectId(userId);
    maintenance.submittedAt = new Date();
    await maintenance.save();

    // Update vehicle status to IN_MAINTENANCE
    await this.vehicleModel.findByIdAndUpdate(maintenance.vehicleId, {
      $set: { vehicleStatus: VehicleStatus.IN_MAINTENANCE },
    });

    return maintenance;
  }

  // ===================== APPROVE =====================

  async approve(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<MaintenanceDocument> {
    this.validateObjectId(id, 'Maintenance ID');
    this.assertManagerRole(userRole);

    const maintenance = await this.maintenanceModel.findById(id).exec();
    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }

    if (maintenance.status !== MaintenanceStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot approve maintenance in ${maintenance.status} status. Only SUBMITTED can be approved.`,
      );
    }

    maintenance.status = MaintenanceStatus.APPROVED;
    maintenance.approvedBy = new Types.ObjectId(userId);
    maintenance.approvedAt = new Date();

    return maintenance.save();
  }

  // ===================== REJECT =====================

  async reject(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<MaintenanceDocument> {
    this.validateObjectId(id, 'Maintenance ID');
    this.assertManagerRole(userRole);

    const maintenance = await this.maintenanceModel.findById(id).exec();
    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }

    if (maintenance.status !== MaintenanceStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot reject maintenance in ${maintenance.status} status. Only SUBMITTED can be rejected.`,
      );
    }

    maintenance.status = MaintenanceStatus.REJECTED;
    maintenance.rejectedBy = new Types.ObjectId(userId);
    maintenance.rejectedAt = new Date();
    await maintenance.save();

    // Revert vehicle status back to ACTIVATE
    await this.vehicleModel.findByIdAndUpdate(maintenance.vehicleId, {
      $set: { vehicleStatus: VehicleStatus.ACTIVATE },
    });

    return maintenance;
  }

  // ===================== COMPLETE =====================

  async complete(
    id: string,
    userId: string,
    actualCost: number,
  ): Promise<MaintenanceDocument> {
    this.validateObjectId(id, 'Maintenance ID');

    const maintenance = await this.maintenanceModel.findById(id).exec();
    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }

    if (maintenance.status !== MaintenanceStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot complete maintenance in ${maintenance.status} status. Only APPROVED can be completed.`,
      );
    }

    maintenance.status = MaintenanceStatus.COMPLETED;
    maintenance.actualCost = actualCost;
    maintenance.completedBy = new Types.ObjectId(userId);
    maintenance.completedAt = new Date();
    await maintenance.save();

    // Revert vehicle status back to ACTIVATE
    await this.vehicleModel.findByIdAndUpdate(maintenance.vehicleId, {
      $set: { vehicleStatus: VehicleStatus.ACTIVATE },
    });

    return maintenance;
  }

  // ===================== GET ALL FOR VEHICLE =====================

  async findByVehicle(vehicleId: string): Promise<MaintenanceDocument[]> {
    this.validateObjectId(vehicleId, 'vehicleId');

    return this.maintenanceModel
      .find({ vehicleId: new Types.ObjectId(vehicleId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ===================== HELPERS =====================

  private assertManagerRole(role: string): void {
    if (role !== AgencyRole.PRINCIPAL && role !== AgencyRole.FLEET_MANAGER) {
      throw new ForbiddenException(
        'Only PRINCIPAL or FLEET_MANAGER can perform this action',
      );
    }
  }
}
