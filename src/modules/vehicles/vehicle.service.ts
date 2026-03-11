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
import { UpdateVehicleDto, UpdateVehiclePhotosDto } from './dto/update-vehicle.dto';
import { RemoveVehiclePhotosDto } from './dto/remove-vehicle-photos.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AgenciesService } from '../../agencies/agencies.service';
import { SubscriptionTier } from '../../agencies/schemas/agency.schema';
import { LogbookSessionAtoComplianceService } from '../logbooksession-ato-compliance/logbook-session-ato-compliance.service';
import { AwsService } from '../../aws/aws.service';
import { v4 as uuid } from 'uuid';
import * as path from 'path';

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
    private readonly awsService: AwsService,
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
    displayPhoto: Express.Multer.File,
    vehiclePhotos?: Express.Multer.File[],
  ): Promise<{ vehicle: VehicleDocument; logbookSessionId: any }> {
    const vehicleData: any = {
      ...createVehicleDto,
      agencyId: new Types.ObjectId(agencyId),
      displayPhoto: null,
      vehiclePhotos: [],
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

    // ── Update photos logic ──
    const displayExt = path.extname(displayPhoto.originalname).toLowerCase();
    const displayKey = `${agencyId}/vehicles/${vehicle._id}/display-${uuid()}${displayExt}`;
    await this.awsService.uploadFile(displayPhoto.buffer, displayKey, displayPhoto.mimetype);
    vehicle.displayPhoto = displayKey;

    if (vehiclePhotos && vehiclePhotos.length > 0) {
      const photoKeys = await Promise.all(
        vehiclePhotos.map(async (file) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const key = `${agencyId}/vehicles/${vehicle._id}/gallery-${uuid()}${ext}`;
          return this.awsService.uploadFile(file.buffer, key, file.mimetype);
        }),
      );
      vehicle.vehiclePhotos = photoKeys;
    }

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
      vehicle: await this.attachPhotoUrls(saved),
      logbookSessionId: newSession._id,
    };
  }

  private async attachPhotoUrls(vehicle: VehicleDocument): Promise<any> {
    const obj = vehicle.toObject();
    
    // Display Photo
    if (obj.displayPhoto) {
      obj['displayPhotoUrl'] = await this.awsService.getSignedUrl(obj.displayPhoto);
    } else {
      obj['displayPhotoUrl'] = null;
    }

    // Gallery Photos
    if (obj.vehiclePhotos && obj.vehiclePhotos.length > 0) {
      obj['vehiclePhotoUrls'] = await Promise.all(
        obj.vehiclePhotos.map(key => this.awsService.getSignedUrl(key))
      );
    } else {
      obj['vehiclePhotoUrls'] = [];
    }

    return obj;
  }

  async findAll(
    agencyId: string,
    officeId?: string,
    role?: string,
  ): Promise<VehicleDocument[]> {
    const isPrincipal = role === 'PRINCIPAL';
    const filter: any = {};
    
    if (!isPrincipal) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    if (officeId) {
      this.validateObjectId(officeId, 'officeId');
      filter.officeId = new Types.ObjectId(officeId);
    }

    const vehicles = await this.vehicleModel.find(filter).sort({ createdAt: -1 }).exec();
    return Promise.all(vehicles.map(v => this.attachPhotoUrls(v)));
  }

  async findOne(vehicleId: string, agencyId: string, role?: string): Promise<any> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const filter: any = { _id: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const vehicle = await this.vehicleModel
      .findOne(filter)
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    return this.attachPhotoUrls(vehicle);
  }

  async update(
    vehicleId: string,
    updateVehicleDto: UpdateVehicleDto,
    agencyId: string,
    role?: string,
  ): Promise<any> {
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

    const filter: any = { _id: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        filter,
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    return this.attachPhotoUrls(vehicle);
  }

  async remove(vehicleId: string, agencyId: string, role?: string): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const filter: any = { _id: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    // 1. Find the vehicle
    const vehicle = await this.vehicleModel
      .findOne(filter)
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

    // 4. Cleanup photos from S3
    if (vehicle.displayPhoto) {
      this.awsService.deleteFile(vehicle.displayPhoto).catch((e) =>
        console.error(`Failed to delete displayPhoto from S3: ${e.message}`),
      );
    }
    if (vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0) {
      vehicle.vehiclePhotos.forEach((photo) => {
        this.awsService.deleteFile(photo).catch((e) =>
          console.error(`Failed to delete gallery photo from S3: ${e.message}`),
        );
      });
    }

    return vehicle;
  }

  async toggleStatus(
    vehicleId: string,
    agencyId: string,
    role?: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const filter: any = { _id: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const vehicle = await this.vehicleModel
      .findOne(filter)
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
    role?: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const filter: any = { _id: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const vehicle = await this.vehicleModel
      .findOne(filter)
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
    role?: string,
  ): Promise<any[]> {
    const vehicle = await this.findOne(vehicleId, agencyId, role);
    return vehicle.loanRepaymentHistory || [];
  }

  async updateVehiclePhotos(
    vehicleId: string,
    agencyId: string,
    displayPhoto?: Express.Multer.File,
    addPhotos?: Express.Multer.File[],
    role?: string,
  ): Promise<any> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const filter: any = { _id: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const vehicle = await this.vehicleModel
      .findOne(filter)
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const updateQuery: any = {};
    const setQuery: any = {};
    const pushQuery: any = {};

    if (displayPhoto) {
      // 1. Delete old display photo if it exists
      if (vehicle.displayPhoto) {
        this.awsService.deleteFile(vehicle.displayPhoto).catch((e) =>
          console.error(`Failed to delete old displayPhoto from S3: ${e.message}`),
        );
      }
      // 2. Upload new display photo
      const ext = path.extname(displayPhoto.originalname).toLowerCase();
      const key = `${agencyId}/vehicles/${vehicle._id}/display-${uuid()}${ext}`;
      await this.awsService.uploadFile(displayPhoto.buffer, key, displayPhoto.mimetype);
      setQuery.displayPhoto = key;
    }

    if (addPhotos && addPhotos.length > 0) {
      const newPhotoKeys = await Promise.all(
        addPhotos.map(async (file) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const key = `${agencyId}/vehicles/${vehicle._id}/gallery-${uuid()}${ext}`;
          return this.awsService.uploadFile(file.buffer, key, file.mimetype);
        }),
      );
      pushQuery.vehiclePhotos = { $each: newPhotoKeys };
    }

    if (Object.keys(setQuery).length > 0) {
      updateQuery.$set = setQuery;
    }

    if (Object.keys(pushQuery).length > 0) {
      updateQuery.$push = pushQuery;
    }

    if (Object.keys(updateQuery).length === 0) {
      throw new BadRequestException('No photo updates provided');
    }

    const updated = await this.vehicleModel
      .findOneAndUpdate(
        filter,
        updateQuery,
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found after update`);
    }

    return this.attachPhotoUrls(updated);
  }

  async removeVehiclePhotos(
    vehicleId: string,
    dto: RemoveVehiclePhotosDto,
    agencyId: string,
    role?: string,
  ): Promise<any> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const filter: any = { _id: new Types.ObjectId(vehicleId) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const vehicle = await this.vehicleModel
      .findOne(filter)
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    let updateQuery: any = {};
    let photosToDelete: string[] = [];

    if (dto.deleteAll === true) {
      updateQuery = { $set: { vehiclePhotos: [] } };
      photosToDelete = vehicle.vehiclePhotos;
    } else if (dto.photos && dto.photos.length > 0) {
      updateQuery = { $pull: { vehiclePhotos: { $in: dto.photos } } };
      photosToDelete = dto.photos;
    } else {
      throw new BadRequestException(
        'Either photos array or deleteAll: true must be provided',
      );
    }

    const updatedVehicle = await this.vehicleModel
      .findOneAndUpdate(
        filter,
        updateQuery,
        { new: true },
      )
      .exec();

    if (!updatedVehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found after update`);
    }

    if (photosToDelete.length > 0) {
      photosToDelete.forEach((photo) => {
        this.awsService.deleteFile(photo).catch((e) =>
          console.error(`Failed to delete gallery photo from S3: ${e.message}`),
        );
      });
    }

    return this.attachPhotoUrls(updatedVehicle);
  }
}
