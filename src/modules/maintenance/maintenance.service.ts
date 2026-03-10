import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Maintenance,
  MaintenanceDocument,
  MaintenanceStatus,
  MaintenanceType,
} from './schemas/maintenance.schema';
import {
  LogbookSession,
  LogbookSessionDocument,
} from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { Vehicle, VehicleDocument, VehicleStatus } from '../vehicles/schemas/vehicle.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { CreateMaintenanceDto } from './dtos/create-maintenance.dto';
import { AgencyRole } from '../../agencies/schemas/agency.schema';
import { AwsService } from '../../aws/aws.service';

const PREVENTIVE_INTERVAL_KM = 5000;
const SNOOZE_INTERVAL_KM = 500;
const SNOOZE_DAYS = 14;

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectModel(Maintenance.name)
    private maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(LogbookSession.name)
    private logbookSessionModel: Model<LogbookSessionDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
    private readonly awsService: AwsService,
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
    file?: Express.Multer.File,
  ): Promise<MaintenanceDocument> {
    this.logger.log(`Creating maintenance: vehicleId=${dto.vehicleId}, userId=${userId}, agencyId=${agencyId}`);
    
    this.validateObjectId(dto.vehicleId, 'vehicleId');
    if (userId) this.validateObjectId(userId, 'userId');
    if (agencyId) this.validateObjectId(agencyId, 'agencyId');
    
    if (!agencyId) {
      this.logger.error('agencyId is missing in create maintenance request');
      throw new BadRequestException('agencyId is required to create maintenance');
    }

    // Find latest logbook session for the vehicle
    const latestSession = await this.logbookSessionModel
      .findOne({ vehicleId: new Types.ObjectId(dto.vehicleId) })
      .sort({ startDate: -1 })
      .exec();

    if (!latestSession) {
      this.logger.warn(`No logbook session found for vehicle ${dto.vehicleId}`);
      throw new NotFoundException(
        `No logbook session found for vehicle ${dto.vehicleId}`,
      );
    }

    this.logger.log(`Found latest session: id=${latestSession._id}, endOdometerInKms=${latestSession.endOdometerInKms}`);

    try {
      const maintenance = new this.maintenanceModel({
        vehicleId: new Types.ObjectId(dto.vehicleId),
        agencyId: agencyId ? new Types.ObjectId(agencyId) : null,
        maintenanceType: dto.maintenanceType,
        description: dto.description || null,
        odometerAtRequest: latestSession.endOdometerInKms || 0,
        estimatedCost: dto.estimatedCost || null,
        status: MaintenanceStatus.SUBMITTED,
        createdBy: userId ? new Types.ObjectId(userId) : null,
        submittedBy: userId ? new Types.ObjectId(userId) : null,
        submittedAt: new Date(),
      });

      if (file) {
        const key = `maintenance/${maintenance._id.toString()}-${Date.now()}-${file.originalname}`;
        await this.awsService.uploadFile(file.buffer, key, file.mimetype);
        maintenance.photoKey = key;
      }

      const savedFinal = await maintenance.save();
      this.logger.log(`Maintenance saved successfully: id=${savedFinal._id}`);

      // Automatically move vehicle to IN_MAINTENANCE status
      await this.vehicleModel.findByIdAndUpdate(dto.vehicleId, {
        $set: { vehicleStatus: VehicleStatus.IN_MAINTENANCE },
      });

      return this.attachPhotoUrl(savedFinal);
    } catch (error) {
      this.logger.error(`Error saving maintenance: ${error.message}`, error.stack);
      throw error;
    }
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

    // If it was an auto-generated maintenance, find the latest COMPLETED one to snooze it
    if (maintenance.autoGenerated) {
      const latestCompleted = await this.maintenanceModel
        .findOne({
          vehicleId: maintenance.vehicleId,
          status: MaintenanceStatus.COMPLETED,
        })
        .sort({ completedAt: -1 })
        .exec();

      if (latestCompleted && latestCompleted.nextServiceDueAtKm != null) {
        // Push the threshold forward (snooze)
        latestCompleted.nextServiceDueAtKm += SNOOZE_INTERVAL_KM;

        // Also update the scheduled date (approximate snooze)
        if (latestCompleted.scheduledServiceDate) {
          const newDate = new Date(latestCompleted.scheduledServiceDate);
          newDate.setDate(newDate.getDate() + SNOOZE_DAYS);
          latestCompleted.scheduledServiceDate = newDate;
        }

        await latestCompleted.save();

        // Sync the snoozed values to the vehicle
        await this.vehicleModel.findByIdAndUpdate(maintenance.vehicleId, {
          $set: {
            nextServiceDueAtKm: latestCompleted.nextServiceDueAtKm,
            scheduledServiceDate: latestCompleted.scheduledServiceDate,
          },
        });
      }
    }

    // Revert vehicle status back to ASSIGNED (only if driver is STILL assigned to this vehicle) or ACTIVATE
    const vehicle = await this.vehicleModel.findById(maintenance.vehicleId).exec();
    let newStatus = VehicleStatus.ACTIVATE;

    if (vehicle?.currentDriverId) {
      const driver = await this.driverModel.findById(vehicle.currentDriverId).exec();
      // If driver is still assigned to THIS specific vehicle
      if (driver?.assignedVehicle?.toString() === vehicle._id.toString()) {
        newStatus = VehicleStatus.ASSIGNED;
      }
    }

    await this.vehicleModel.findByIdAndUpdate(maintenance.vehicleId, {
      $set: { vehicleStatus: newStatus },
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

    // ── Calculate next service due ──
    const nextServiceDueAtKm =
      maintenance.odometerAtRequest + PREVENTIVE_INTERVAL_KM;
    maintenance.nextServiceDueAtKm = nextServiceDueAtKm;

    // Fetch latest logbook session to determine current KM and average
    const latestSession = await this.logbookSessionModel
      .findOne({ vehicleId: maintenance.vehicleId })
      .sort({ startDate: -1 })
      .exec();

    let scheduledServiceDate: Date;

    if (latestSession && latestSession.endOdometerInKms != null) {
      const currentKm = latestSession.endOdometerInKms;
      const remainingKm = nextServiceDueAtKm - currentKm;

      // Calculate avgKmPerDay from the session
      let avgKmPerDay = 40; // fallback default

      if (latestSession.startDate && latestSession.endDate) {
        const totalDays = Math.max(
          1,
          Math.ceil(
            (new Date(latestSession.endDate).getTime() -
              new Date(latestSession.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );

        if (totalDays >= 14 && latestSession.totalKms > 0) {
          avgKmPerDay = latestSession.totalKms / totalDays;
        }
      }

      if (avgKmPerDay > 0 && remainingKm > 0) {
        const daysToReach = Math.ceil(remainingKm / avgKmPerDay);
        scheduledServiceDate = new Date();
        scheduledServiceDate.setDate(
          scheduledServiceDate.getDate() + daysToReach,
        );
      } else {
        // Fallback: 90 days from today
        scheduledServiceDate = new Date();
        scheduledServiceDate.setDate(scheduledServiceDate.getDate() + 90);
      }
    } else {
      // No logbook session data — fallback to 90 days
      scheduledServiceDate = new Date();
      scheduledServiceDate.setDate(scheduledServiceDate.getDate() + 90);
    }

    maintenance.scheduledServiceDate = scheduledServiceDate;
    await maintenance.save();

    // Revert vehicle status back to ASSIGNED (only if driver is STILL assigned to this vehicle) or ACTIVATE
    const vehicle = await this.vehicleModel.findById(maintenance.vehicleId).exec();
    let newStatus = VehicleStatus.ACTIVATE;

    if (vehicle?.currentDriverId) {
      const driver = await this.driverModel.findById(vehicle.currentDriverId).exec();
      // If driver is still assigned to THIS specific vehicle
      if (driver?.assignedVehicle?.toString() === vehicle._id.toString()) {
        newStatus = VehicleStatus.ASSIGNED;
      }
    }

    await this.vehicleModel.findByIdAndUpdate(maintenance.vehicleId, {
      $set: { 
        vehicleStatus: newStatus,
        nextServiceDueAtKm: maintenance.nextServiceDueAtKm,
        scheduledServiceDate: maintenance.scheduledServiceDate,
      },
    });

    return maintenance;
  }

  // ===================== BOOTSTRAP MAINTENANCE CYCLE =====================

  /**
   * Called when a new vehicle is created.
   * Seeds a COMPLETED maintenance record so the 5000 KM cycle starts immediately.
   */
  async bootstrapMaintenanceCycle(
    vehicleId: string,
    agencyId: string,
    currentOdometerKm: number,
    userId?: string,
  ): Promise<void> {
    const vehicleOid = new Types.ObjectId(vehicleId);
    const agencyOid = new Types.ObjectId(agencyId);

    const seedMaintenance = new this.maintenanceModel({
      vehicleId: vehicleOid,
      agencyId: agencyOid,
      maintenanceType: MaintenanceType.GENERAL_INSPECTION,
      description: 'System-generated seed maintenance to start preventive cycle',
      odometerAtRequest: currentOdometerKm,
      status: MaintenanceStatus.COMPLETED,
      autoGenerated: true,
      nextServiceDueAtKm: currentOdometerKm + PREVENTIVE_INTERVAL_KM,
      scheduledServiceDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 90);
        return d;
      })(),
      completedAt: new Date(),
      createdBy: userId ? new Types.ObjectId(userId) : null,
    });

    await seedMaintenance.save();

    // Update vehicle with the next service info
    await this.vehicleModel.findByIdAndUpdate(vehicleOid, {
      $set: {
        nextServiceDueAtKm: seedMaintenance.nextServiceDueAtKm,
        scheduledServiceDate: seedMaintenance.scheduledServiceDate,
      },
    });
  }

  // ===================== AUTO-CREATE MAINTENANCE =====================

  /**
   * Called from KmLogsService after a trip is created.
   * Checks if odometer has crossed the nextServiceDueAtKm threshold
   * and creates a SUBMITTED maintenance if necessary.
   */
  async autoCreateMaintenance(
    vehicleId: string,
    agencyId: string,
    currentKm: number,
  ): Promise<void> {
    const vehicleOid = new Types.ObjectId(vehicleId);

    // Fetch latest COMPLETED maintenance for this vehicle
    const latestCompleted = await this.maintenanceModel
      .findOne({
        vehicleId: vehicleOid,
        status: MaintenanceStatus.COMPLETED,
      })
      .sort({ completedAt: -1 })
      .exec();

    if (!latestCompleted || latestCompleted.nextServiceDueAtKm == null) {
      return; // No completed maintenance or no threshold set — do nothing
    }

    if (currentKm < latestCompleted.nextServiceDueAtKm) {
      return; // Hasn't reached the threshold yet
    }

    // Check for existing SUBMITTED maintenance to prevent duplicates
    const existingActive = await this.maintenanceModel
      .findOne({
        vehicleId: vehicleOid,
        status: MaintenanceStatus.SUBMITTED,
      })
      .exec();

    if (existingActive) {
      return; // Already have an active maintenance — prevent duplicates
    }

    // Create auto-generated SUBMITTED maintenance
    const autoMaintenance = new this.maintenanceModel({
      vehicleId: vehicleOid,
      agencyId: agencyId ? new Types.ObjectId(agencyId) : latestCompleted.agencyId,
      maintenanceType: MaintenanceType.GENERAL_INSPECTION,
      description: 'Auto-generated preventive maintenance (5000 KM interval)',
      odometerAtRequest: currentKm,
      status: MaintenanceStatus.SUBMITTED,
      autoGenerated: true,
      submittedAt: new Date(),
      createdBy: null,
    });

    await autoMaintenance.save();

    // Update vehicle status to IN_MAINTENANCE
    await this.vehicleModel.findByIdAndUpdate(vehicleOid, {
      $set: { vehicleStatus: VehicleStatus.IN_MAINTENANCE },
    });
  }

  // ===================== GET ALL FOR VEHICLE =====================

  async findByVehicle(vehicleId: string, agencyId?: string, role?: string): Promise<MaintenanceDocument[]> {
    this.validateObjectId(vehicleId, 'vehicleId');

    const filter: any = { vehicleId: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL' && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const records = await this.maintenanceModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return this.attachPhotoUrlList(records);
  }

  async findAll(
    agencyId: string,
    status?: MaintenanceStatus,
    role?: string,
  ): Promise<MaintenanceDocument[]> {
    const isPrincipal = role === 'PRINCIPAL';
    const query: any = {};

    if (!isPrincipal) {
      query.agencyId = new Types.ObjectId(agencyId);
    }

    if (status) {
      query.status = status;
    }

    const records = await this.maintenanceModel
      .find(query)
      .populate('vehicleId')
      .sort({ createdAt: -1 })
      .exec();

    return this.attachPhotoUrlList(records);
  }

  // ===================== HELPERS =====================

  private assertManagerRole(role: string): void {
    if (role !== AgencyRole.PRINCIPAL && role !== AgencyRole.FLEET_MANAGER) {
      throw new ForbiddenException(
        'Only PRINCIPAL or FLEET_MANAGER can perform this action',
      );
    }
  }

  private async attachPhotoUrl(maintenance: MaintenanceDocument): Promise<any> {
    const obj = maintenance.toObject();
    if (obj.photoKey) {
      obj['photoUrl'] = await this.awsService.getSignedUrl(obj.photoKey);
    } else {
      obj['photoUrl'] = null;
    }
    return obj;
  }

  private async attachPhotoUrlList(maintenances: MaintenanceDocument[]): Promise<any[]> {
    return Promise.all(maintenances.map((m) => this.attachPhotoUrl(m)));
  }
}
