import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver, DriverDocument } from './schemas/driver.schema';
import {
  Vehicle,
  VehicleDocument,
  VehicleStatus,
} from '../vehicles/schemas/vehicle.schema';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
  ) {}

  private validateObjectId(id: string, label = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }
  // DRIVER MANAGEMENT

  findByEmail(email: string): Promise<DriverDocument | null> {
    return this.driverModel
      .findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } })
      .exec();
  }

  async create(
    data: {
      name: string;
      email: string;
      phoneNumber: string;
      driverLicenseNumber: string;
    },
    agencyId: string,
  ): Promise<DriverDocument> {
    this.validateObjectId(agencyId, 'agencyId');

    const driver = new this.driverModel({
      ...data,
      agencyId: new Types.ObjectId(agencyId),
    });

    return driver.save();
  }

  async findAll(agencyId: string): Promise<DriverDocument[]> {
    this.validateObjectId(agencyId, 'agencyId');

    return this.driverModel
      .find({ agencyId: new Types.ObjectId(agencyId) })
      .populate('assignedVehicle')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(driverId: string, agencyId: string): Promise<DriverDocument> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(agencyId, 'agencyId');

    const driver = await this.driverModel
      .findOne({
        _id: new Types.ObjectId(driverId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .populate('assignedVehicle')
      .exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    return driver;
  }

  async update(
    driverId: string,
    updateDriverDto: UpdateDriverDto,
    agencyId: string,
  ): Promise<DriverDocument> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(agencyId, 'agencyId');

    const driver = await this.driverModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(driverId),
          agencyId: new Types.ObjectId(agencyId),
        },
        { $set: updateDriverDto },
        { new: true },
      )
      .populate('assignedVehicle')
      .exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    return driver;
  }

  async remove(driverId: string, agencyId: string): Promise<void> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(agencyId, 'agencyId');

    // 1. Find the driver to check for assigned vehicle
    const driver = await this.driverModel.findOne({
      _id: new Types.ObjectId(driverId),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    // 2. Cleanup Vehicle if assigned
    if (driver.assignedVehicle) {
      await this.vehicleModel.updateOne(
        { _id: driver.assignedVehicle },
        { 
          $set: { 
            vehicleStatus: VehicleStatus.ACTIVATE,
            currentDriverId: null,
            requestedBy: null,
            requestedAt: null
          } 
        }
      ).exec();
    }

    // 3. Delete Driver
    await this.driverModel.deleteOne({ _id: driver._id }).exec();
  }
  // DRIVER ASSIGNMENT

  async assignVehicle(
    driverId: string,
    vehicleId: string,
    agencyId: string,
  ): Promise<DriverDocument> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(vehicleId, 'Vehicle ID');
    this.validateObjectId(agencyId, 'agencyId');

    // 1. Check if vehicle is already assigned or in maintenance
    const vehicle = await this.vehicleModel
      .findOne({
        _id: new Types.ObjectId(vehicleId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    if (
      vehicle.vehicleStatus === VehicleStatus.DEACTIVATE ||
      vehicle.vehicleStatus === VehicleStatus.IN_MAINTENANCE ||
      vehicle.vehicleStatus === VehicleStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        `Cannot assign vehicle in ${vehicle.vehicleStatus} status`,
      );
    }

    // 2. Check if driver already has an assigned vehicle
    const existingDriver = await this.driverModel
      .findOne({
        _id: new Types.ObjectId(driverId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!existingDriver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    if (existingDriver.assignedVehicle) {
      throw new BadRequestException(
        `Driver already has an assigned vehicle: ${existingDriver.assignedVehicle}`,
      );
    }

    // 3. Update Vehicle Status FIRST
    await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
        },
        {
          $set: {
            vehicleStatus: VehicleStatus.ASSIGNED,
            currentDriverId: new Types.ObjectId(driverId),
            requestedBy: null,
            requestedAt: null,
          },
        },
      )
      .exec();

    // 4. Update Driver and POPULATE (will pick up updated vehicle)
    const driver = await this.driverModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(driverId),
          agencyId: new Types.ObjectId(agencyId),
        },
        { $set: { assignedVehicle: new Types.ObjectId(vehicleId) } },
        { new: true },
      )
      .populate('assignedVehicle')
      .exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    return driver;
  }

  async unassignVehicle(
    driverId: string,
    vehicleId: string,
    agencyId: string,
  ): Promise<DriverDocument> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(vehicleId, 'Vehicle ID');
    this.validateObjectId(agencyId, 'agencyId');

    // 1. Revert Vehicle Status FIRST
    // If the vehicle is CURRENTLY assigned to this driver, revert to ACTIVATE
    await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
          currentDriverId: new Types.ObjectId(driverId), // Strictly unassign if this driver is indeed the current driver
        },
        {
          $set: {
            vehicleStatus: VehicleStatus.ACTIVATE,
            currentDriverId: null,
            requestedBy: null,
            requestedAt: null,
          },
        },
      )
      .exec();

    // 2. Update Driver
    const driver = await this.driverModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(driverId),
          agencyId: new Types.ObjectId(agencyId),
          assignedVehicle: new Types.ObjectId(vehicleId),
        },
        { $set: { assignedVehicle: null } },
        { new: true },
      )
      .populate('assignedVehicle')
      .exec();

    if (!driver) {
      throw new NotFoundException(
        `Driver with ID ${driverId} not found or vehicle not assigned`,
      );
    }

    return driver;
  }

  // ─── Vehicle Request / Approval Workflow ─────────────────────────────────────

  /**
   * Driver requests a vehicle.
   * Scoped to the user's agency.
   */
  async requestVehicle(
    vehicleId: string,
    driverId: string,
    agencyId: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(agencyId, 'Agency ID');

    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
          vehicleStatus: VehicleStatus.ACTIVATE,
        },
        {
          $set: {
            vehicleStatus: VehicleStatus.UNDER_AGREEMENT,
            requestedBy: new Types.ObjectId(driverId),
            requestedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!vehicle) {
      throw new BadRequestException(
        'Vehicle not available or does not belong to your agency',
      );
    }

    return vehicle;
  }

  /**
   * Manager / Principal approves a pending vehicle request.
   */
  async approveVehicle(
    vehicleId: string,
    agencyId: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');
    this.validateObjectId(agencyId, 'Agency ID');

    const current = await this.vehicleModel
      .findOne({
        _id: new Types.ObjectId(vehicleId),
        agencyId: new Types.ObjectId(agencyId),
        vehicleStatus: VehicleStatus.UNDER_AGREEMENT,
      })
      .exec();

    if (!current) {
      throw new BadRequestException(
        'Vehicle is not in UNDER_AGREEMENT status or does not exist',
      );
    }

    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
          vehicleStatus: VehicleStatus.UNDER_AGREEMENT,
        },
        {
          $set: {
            vehicleStatus: VehicleStatus.ASSIGNED,
            currentDriverId: current.requestedBy,
            requestedBy: null,
            requestedAt: null,
          },
        },
        { new: true },
      )
      .exec();

    if (!vehicle) {
      throw new BadRequestException(
        'Vehicle is not in UNDER_AGREEMENT status or does not exist',
      );
    }

    return vehicle;
  }

  /**
   * Manager / Principal rejects a pending vehicle request.
   */
  async rejectVehicle(
    vehicleId: string,
    agencyId: string,
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');
    this.validateObjectId(agencyId, 'Agency ID');

    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
          vehicleStatus: VehicleStatus.UNDER_AGREEMENT,
        },
        {
          $set: {
            vehicleStatus: VehicleStatus.ACTIVATE,
            requestedBy: null,
            requestedAt: null,
          },
        },
        { new: true },
      )
      .exec();

    if (!vehicle) {
      throw new BadRequestException(
        'Vehicle is not in UNDER_AGREEMENT status or does not exist',
      );
    }

    return vehicle;
  }
}
