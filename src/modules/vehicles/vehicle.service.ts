import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Vehicle,
  VehicleDocument,
  VehicleStatus,
} from './schemas/vehicle.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
    @Inject(forwardRef(() => MaintenanceService))
    private readonly maintenanceService: MaintenanceService,
  ) {}

  private validateObjectId(id: string, label = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  async create(
    createVehicleDto: CreateVehicleDto,
    agencyId: string,
  ): Promise<VehicleDocument> {
    const vehicle = new this.vehicleModel({
      ...createVehicleDto,
      agencyId: new Types.ObjectId(agencyId),
    });
    const saved = await vehicle.save();

    // Bootstrap the preventive maintenance cycle for this new vehicle
    await this.maintenanceService.bootstrapMaintenanceCycle(
      saved._id.toString(),
      agencyId,
      createVehicleDto.odometerInKms || 0,
    );

    return saved;
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

    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
        },
        { $set: updateVehicleDto },
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
}
