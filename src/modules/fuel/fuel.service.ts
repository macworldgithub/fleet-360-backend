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
import { NotificationService } from 'src/notification/notification.service';
import { FuelAnalyticsService } from './fuel-analytics.service';

@Injectable()
export class FuelService {
  constructor(
    @InjectModel(FuelTransaction.name)
    private fuelModel: Model<FuelTransactionDocument>,
    private readonly notificationService: NotificationService,
    private readonly fuelAnalyticsService: FuelAnalyticsService,
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

    const fuel = await this.fuelModel.create(data);
    // Fuel Added Notification
    await this.notificationService.send({
      type: 'FUEL_ADDED',
      title: 'Fuel Added',
      message: `Fuel of ${fuel.liters}L added (Cost: ${fuel.totalCost})`,
      vehicleId: fuel.vehicleId.toString(),
      agencyId: fuel.agencyId.toString(),
    });

    // High Fuel Cost Alert (threshold-based)
    const HIGH_COST_THRESHOLD = 10000; // adjust as needed

    if (fuel.totalCost > HIGH_COST_THRESHOLD) {
      await this.notificationService.send({
        type: 'HIGH_FUEL_COST',
        title: 'High Fuel Cost Alert',
        message: `High fuel cost detected: ${fuel.totalCost}`,
        vehicleId: fuel.vehicleId.toString(),
        agencyId: fuel.agencyId.toString(),
      });
    }

    await this.fuelAnalyticsService.checkFuelAnomalies(
      fuel.vehicleId.toString(),
      fuel.agencyId.toString(),
      fuel,
    );

    return fuel;
  }

  async findAll(query: any, agencyId: string, role?: string) {
    const isPrincipal = role === 'PRINCIPAL';
    const filter: any = {
      isDeleted: false,
    };

    if (!isPrincipal) {
      filter.agencyId = new Types.ObjectId(agencyId);
    } else if (query.agencyId) {
      filter.agencyId = new Types.ObjectId(query.agencyId);
    }

    if (query.vehicleId) filter.vehicleId = new Types.ObjectId(query.vehicleId);

    return this.fuelModel.find(filter).sort({ fuelDate: -1 }).exec();
  }

  async findOne(id: string, agencyId: string, role?: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid ID');

    const filter: any = { _id: new Types.ObjectId(id) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const fuel = await this.fuelModel.findOne(filter).exec();

    if (!fuel) throw new NotFoundException('Transaction not found');
    return fuel;
  }

  async update(
    id: string,
    dto: UpdateFuelTransactionDto,
    agencyId: string,
    role?: string,
  ) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid ID');

    const filter: any = { _id: new Types.ObjectId(id) };
    if (role !== 'PRINCIPAL') {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    const fuel = await this.fuelModel
      .findOneAndUpdate(filter, dto, { new: true })
      .exec();

    if (!fuel) throw new NotFoundException('Transaction not found');
    return fuel;
  }
}
