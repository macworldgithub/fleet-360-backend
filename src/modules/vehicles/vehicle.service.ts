import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Vehicle,
  VehicleDocument,
  VehicleStatus,
  LeaseType,
} from './schemas/vehicle.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AgenciesService } from '../../agencies/agencies.service';
import { SubscriptionTier } from '../../agencies/schemas/agency.schema';
import { LogbookSessionAtoComplianceService } from '../logbooksession-ato-compliance/logbook-session-ato-compliance.service';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
    @Inject(forwardRef(() => MaintenanceService))
    private readonly maintenanceService: MaintenanceService,
    private readonly agenciesService: AgenciesService,
    private readonly logbookSessionService: LogbookSessionAtoComplianceService,
  ) {}

  private validateObjectId(id: string, label = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  /**
   * Calculate Australian FBT year string (1 Apr – 31 Mar).
   * e.g. date in Jul 2025 → "2025-2026", date in Feb 2026 → "2025-2026"
   */
  private calculateFbtYear(date: Date): string {
    const month = date.getMonth(); // 0-indexed
    const year = date.getFullYear();
    return month >= 3
      ? `${year}-${year + 1}`
      : `${year - 1}-${year}`;
  }

  async create(
    createVehicleDto: CreateVehicleDto,
    agencyId: string,
    userId: string,
  ): Promise<{ vehicle: VehicleDocument; logbookSessionId: any }> {
    const vehicleData: any = {
      ...createVehicleDto,
      agencyId: new Types.ObjectId(agencyId),
    };

    if (createVehicleDto.leaseType === LeaseType.LOAN) {
      const agency = await this.agenciesService.findById(agencyId);
      if (agency && agency.subscriptionTier === SubscriptionTier.ESSENTIAL) {
        throw new BadRequestException(
          'Agencies with ESSENTIAL subscription tier cannot add vehicles with LOAN lease type. Please upgrade to OPTIMISED or PARTNER tier.',
        );
      }
    }

    if (createVehicleDto.officeId) {
      this.validateObjectId(createVehicleDto.officeId, 'officeId');
      vehicleData.officeId = new Types.ObjectId(createVehicleDto.officeId);
    }

    // Check for duplicate VIN to avoid 500 error
    const existingVehicle = await this.vehicleModel.findOne({ vin: createVehicleDto.vin }).exec();
    if (existingVehicle) {
      throw new ConflictException(`Vehicle with VIN ${createVehicleDto.vin} already exists`);
    }

    if (userId) {
      this.validateObjectId(userId, 'userId');
      const userOid = new Types.ObjectId(userId);
      vehicleData.createdBy = userOid;
      vehicleData.requestedBy = userOid;
      vehicleData.requestedAt = new Date();
    }

    const vehicle = new this.vehicleModel(vehicleData);
    const saved = await vehicle.save();

    // Bootstrap the preventive maintenance cycle for this new vehicle
    await this.maintenanceService.bootstrapMaintenanceCycle(
      saved._id.toString(),
      agencyId,
      createVehicleDto.odometerInKms || 0,
      userId,
    );

    // Auto-create a DRAFT logbook session for the new vehicle
    const fbtYear = this.calculateFbtYear(new Date());

    const newSession = await this.logbookSessionService.createLogbookSession(
      {
        vehicleId: saved._id.toString(),
        fbtYear,
      },
      agencyId,
      userId,
    );

    return {
      vehicle: saved,
      logbookSessionId: newSession._id,
    };
  }

  async findAll(
    agencyId: string,
    officeId?: string,
  ): Promise<VehicleDocument[]> {
    const filter: any = { agencyId: new Types.ObjectId(agencyId) };

    if (officeId) {
      this.validateObjectId(officeId, 'officeId');
      filter.officeId = new Types.ObjectId(officeId);
    }

    return this.vehicleModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(vehicleId: string, agencyId: string): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const vehicle = await this.vehicleModel
      .findOne({
        _id: new Types.ObjectId(vehicleId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    return vehicle;
  }

  async update(
    vehicleId: string,
    updateVehicleDto: UpdateVehicleDto,
    agencyId: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const updateData: any = { ...updateVehicleDto };

    if (updateVehicleDto.leaseType === LeaseType.LOAN) {
      const agency = await this.agenciesService.findById(agencyId);
      if (agency && agency.subscriptionTier === SubscriptionTier.ESSENTIAL) {
        throw new BadRequestException(
          'Agencies with ESSENTIAL subscription tier cannot use LOAN lease type. Please upgrade to OPTIMISED or PARTNER tier.',
        );
      }
    }

    if (updateVehicleDto.officeId) {
      this.validateObjectId(updateVehicleDto.officeId, 'officeId');
      updateData.officeId = new Types.ObjectId(updateVehicleDto.officeId);
    }

    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
        },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    return vehicle;
  }

  async remove(vehicleId: string, agencyId: string): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    // 1. Find the vehicle
    const vehicle = await this.vehicleModel
      .findOne({
        _id: new Types.ObjectId(vehicleId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    // 2. Cleanup Drivers if assigned
    await this.driverModel.updateMany(
      { assignedVehicle: vehicle._id },
      { $set: { assignedVehicle: null } }
    ).exec();

    // 3. Delete Vehicle
    await this.vehicleModel.deleteOne({ _id: vehicle._id }).exec();

    return vehicle;
  }

  async toggleStatus(
    vehicleId: string,
    agencyId: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const vehicle = await this.vehicleModel
      .findOne({
        _id: new Types.ObjectId(vehicleId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    if (vehicle.vehicleStatus === VehicleStatus.IN_MAINTENANCE) {
      throw new BadRequestException(
        'Cannot toggle status while vehicle is IN_MAINTENANCE',
      );
    }

    const newStatus =
      vehicle.vehicleStatus === VehicleStatus.ACTIVATE
        ? VehicleStatus.DEACTIVATE
        : VehicleStatus.ACTIVATE;

    vehicle.vehicleStatus = newStatus;
    return vehicle.save();
  }

  async makeLoanRepayment(
    vehicleId: string,
    amount: number,
    agencyId: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const vehicle = await this.vehicleModel
      .findOne({
        _id: new Types.ObjectId(vehicleId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    if (vehicle.leaseType !== LeaseType.LOAN) {
      throw new BadRequestException(
        'Loan repayment is only applicable for vehicles with leaseType LOAN',
      );
    }

    if (!vehicle.loanAmount && vehicle.loanAmount !== 0) {
      throw new BadRequestException(
        'Vehicle does not have a loanAmount set',
      );
    }

    if (amount > vehicle.loanAmount) {
      throw new BadRequestException(
        `Repayment amount (${amount}) exceeds remaining loan balance (${vehicle.loanAmount})`,
      );
    }

    const newBalance = vehicle.loanAmount - amount;

    // Record the history
    vehicle.loanRepaymentHistory.push({
      amount,
      paymentDate: new Date(),
      remainingBalance: newBalance,
    });

    vehicle.loanAmount = newBalance;
    return vehicle.save();
  }

  async getLoanRepaymentHistory(
    vehicleId: string,
    agencyId: string,
  ): Promise<any[]> {
    const vehicle = await this.findOne(vehicleId, agencyId);
    return vehicle.loanRepaymentHistory || [];
  }
}
