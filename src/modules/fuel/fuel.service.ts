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

  async findAll(query: any) {
    const filter: any = { isDeleted: false };

    if (query.vehicleId) filter.vehicleId = query.vehicleId;
    if (query.agencyId) filter.agencyId = query.agencyId;

    return this.fuelModel.find(filter).sort({ fuelDate: -1 });
  }

  async findOne(id: string) {
    const fuel = await this.fuelModel.findById(id);
    if (!fuel) throw new NotFoundException('Transaction not found');
    return fuel;
  }

  async update(id: string, dto: UpdateFuelTransactionDto) {
    const fuel = await this.fuelModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    if (!fuel) throw new NotFoundException('Transaction not found');
    return fuel;
  }
}