import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver, DriverDocument } from './schemas/driver.schema';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
  ) {}

  private validateObjectId(id: string, label = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  // =========================
  // DRIVER MANAGEMENT
  // =========================

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

    const result = await this.driverModel
      .deleteOne({
        _id: new Types.ObjectId(driverId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }
  }

  // =========================
  // DRIVER ASSIGNMENT
  // =========================

  async assignVehicle(
    driverId: string,
    vehicleId: string,
    agencyId: string,
  ): Promise<DriverDocument> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(vehicleId, 'Vehicle ID');
    this.validateObjectId(agencyId, 'agencyId');

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
}
