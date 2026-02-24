import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Vehicle,
  VehicleDocument,
  VehicleStatus,
} from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
  ) {}

  private validateObjectId(id: string, label = 'ID'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleDocument> {
    const vehicle = new this.vehicleModel(createVehicleDto);
    return vehicle.save();
  }

  async findAll(officeId?: string): Promise<VehicleDocument[]> {
    const filter: any = {};

    if (officeId) {
      this.validateObjectId(officeId, 'officeId');
      filter.officeId = new Types.ObjectId(officeId);
    }

    return this.vehicleModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(vehicleId: string): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const vehicle = await this.vehicleModel
      .findOne({
        _id: new Types.ObjectId(vehicleId),
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
  ): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(vehicleId) },
        { $set: updateVehicleDto },
        { new: true },
      )
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    return vehicle;
  }

  async remove(vehicleId: string): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const vehicle = await this.vehicleModel
      .findOneAndDelete({ _id: new Types.ObjectId(vehicleId) })
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    return vehicle;
  }

  async toggleStatus(vehicleId: string): Promise<VehicleDocument> {
    this.validateObjectId(vehicleId, 'Vehicle ID');

    const vehicle = await this.vehicleModel.findById(vehicleId).exec();

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
