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
import { AwsService } from '../../aws/aws.service';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    private readonly awsService: AwsService,
  ) {}

  private validateObjectId(id: string, label = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

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
    file?: Express.Multer.File,
  ): Promise<DriverDocument> {
    this.validateObjectId(agencyId, 'agencyId');

    const driver = new this.driverModel({
      ...data,
      agencyId: new Types.ObjectId(agencyId),
      profilePicture: null,
    });

    if (file) {
      const ext = extname(file.originalname).toLowerCase();
      const key = `${agencyId}/drivers/${driver._id}/profile-${uuidv4()}${ext}`;
      await this.awsService.uploadFile(file.buffer, key, file.mimetype);
      driver.profilePicture = key;
    }

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

  async getProfilePictureUrl(driverId: string, agencyId: string): Promise<string | null> {
    const driver = await this.findOne(driverId, agencyId);
    if (!driver.profilePicture) return null;
    return this.awsService.getSignedUrl(driver.profilePicture);
  }

  async update(
    driverId: string,
    updateDriverDto: UpdateDriverDto,
    agencyId: string,
    file?: Express.Multer.File,
  ): Promise<DriverDocument> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(agencyId, 'agencyId');

    const driver = await this.driverModel
      .findOne({
        _id: new Types.ObjectId(driverId),
        agencyId: new Types.ObjectId(agencyId),
      })
      .exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    if (file) {
      if (driver.profilePicture) {
        try {
          await this.awsService.deleteFile(driver.profilePicture);
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
        }
      }

      const ext = extname(file.originalname).toLowerCase();
      const key = `${agencyId}/drivers/${driver._id}/profile-${uuidv4()}${ext}`;
      await this.awsService.uploadFile(file.buffer, key, file.mimetype);
      driver.profilePicture = key;
    }

    if (updateDriverDto.name) driver.name = updateDriverDto.name;
    if (updateDriverDto.email) driver.email = updateDriverDto.email;
    if (updateDriverDto.phoneNumber) driver.phoneNumber = updateDriverDto.phoneNumber;
    if (updateDriverDto.driverLicenseNumber) driver.driverLicenseNumber = updateDriverDto.driverLicenseNumber;

    const updated = await driver.save();
    const result = await this.driverModel.findById(updated._id).populate('assignedVehicle').exec();
    if (!result) throw new NotFoundException('Driver not found after update');
    return result;
  }

  async remove(driverId: string, agencyId: string): Promise<void> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(agencyId, 'agencyId');

    const driver = await this.driverModel.findOne({
      _id: new Types.ObjectId(driverId),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    if (driver.profilePicture) {
      try {
        await this.awsService.deleteFile(driver.profilePicture);
      } catch (err) {
        console.error('Error deleting driver profile picture on removal:', err);
      }
    }

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

    await this.driverModel.deleteOne({ _id: driver._id }).exec();
  }

  async assignVehicle(
    driverId: string,
    vehicleId: string,
    agencyId: string,
  ): Promise<DriverDocument> {
    this.validateObjectId(driverId, 'Driver ID');
    this.validateObjectId(vehicleId, 'Vehicle ID');
    this.validateObjectId(agencyId, 'agencyId');

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

    await this.vehicleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(vehicleId),
          agencyId: new Types.ObjectId(agencyId),
          currentDriverId: new Types.ObjectId(driverId),
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
