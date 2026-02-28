import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FuelTransaction,
  FuelTransactionDocument,
  FuelProvider,
} from './schemas/fuel-transaction.schema';
import { CreateFuelTransactionDto } from './dto/create-fuel-transaction.dto';
import { UpdateFuelTransactionDto } from './dto/update-fuel-transaction.dto';

@Injectable()
export class FuelService {
  constructor(
    @InjectModel(FuelTransaction.name)
    private fuelModel: Model<FuelTransactionDocument>,
  ) {}

  async create(dto: CreateFuelTransactionDto) {
    if (!Types.ObjectId.isValid(dto.vehicleId))
      throw new BadRequestException('Invalid vehicleId');

    const data = {
      ...dto,
      agencyId: new Types.ObjectId(dto.agencyId),
      vehicleId: new Types.ObjectId(dto.vehicleId),
      fuelDate: new Date(dto.fuelDate),
      provider: FuelProvider.MANUAL,
    };

    return this.fuelModel.create(data);
  }

  async findAll(query: any, agencyId: string) {
    const filter: any = { 
      isDeleted: false,
      agencyId: new Types.ObjectId(agencyId),
    };

    if (query.vehicleId) filter.vehicleId = new Types.ObjectId(query.vehicleId);

    return this.fuelModel.find(filter).sort({ fuelDate: -1 }).exec();
  }

  async findOne(id: string, agencyId: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    
    const fuel = await this.fuelModel.findOne({
      _id: new Types.ObjectId(id),
      agencyId: new Types.ObjectId(agencyId),
    }).exec();

    if (!fuel) throw new NotFoundException('Transaction not found');
    return fuel;
  }

  async update(id: string, dto: UpdateFuelTransactionDto, agencyId: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');

    const fuel = await this.fuelModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), agencyId: new Types.ObjectId(agencyId) },
      dto,
      { new: true },
    ).exec();

    if (!fuel) throw new NotFoundException('Transaction not found');
    return fuel;
  }
}