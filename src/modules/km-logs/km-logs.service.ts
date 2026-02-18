import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KmLog, KmLogDocument } from './schemas/km-log.schema';
import { CreateKmLogDto } from './dto/create-km-log.dto';
import { UpdateKmLogDto } from './dto/update-km-log.dto';

@Injectable()
export class KmLogsService {
  constructor(
    @InjectModel(KmLog.name)
    private kmLogModel: Model<KmLogDocument>,
  ) {}

  private validateObjectId(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: ${id}`);
    }
  }

  private calculateDistance(start: number, end: number): number {
    if (end < start) {
      throw new BadRequestException(
        'endOdometerInKms must be greater than startOdometerInKms',
      );
    }
    return end - start;
  }

  // Placeholder for Mapbox calculation
  private async calculateMapDistance(
    startLocation?: any,
    endLocation?: any,
  ): Promise<number | null> {
    if (!startLocation || !endLocation) return null;

    // TODO: integrate Mapbox Directions API here
    // return distance in kms

    return null;
  }

  async create(dto: CreateKmLogDto) {
    this.validateObjectId(dto.vehicleId, 'vehicleId');

    if (dto.agencyId) this.validateObjectId(dto.agencyId, 'agencyId');
    if (dto.officeId) this.validateObjectId(dto.officeId, 'officeId');

    const distanceInKms = this.calculateDistance(
      dto.startOdometerInKms,
      dto.endOdometerInKms,
    );

    const payload: any = {
      vehicleId: new Types.ObjectId(dto.vehicleId),
      tripDate: new Date(dto.tripDate),
      startOdometerInKms: dto.startOdometerInKms,
      endOdometerInKms: dto.endOdometerInKms,
      distanceInKms,
      tripType: dto.tripType,
      notes: dto.notes ?? null,
      isDeleted: false,
    };

    if (dto.agencyId) payload.agencyId = new Types.ObjectId(dto.agencyId);
    if (dto.officeId) payload.officeId = new Types.ObjectId(dto.officeId);

    const log = await this.kmLogModel.create(payload);

    return log;
  }

  async findAll(filters: any) {
    const query: any = { isDeleted: false };

    if (filters.vehicleId) {
      this.validateObjectId(filters.vehicleId, 'vehicleId');
      query.vehicleId = new Types.ObjectId(filters.vehicleId);
    }

    if (filters.officeId) {
      this.validateObjectId(filters.officeId, 'officeId');
      query.officeId = new Types.ObjectId(filters.officeId);
    }

    if (filters.agencyId) {
      this.validateObjectId(filters.agencyId, 'agencyId');
      query.agencyId = new Types.ObjectId(filters.agencyId);
    }

    if (filters.tripType) {
      query.tripType = filters.tripType;
    }

    if (filters.fromDate || filters.toDate) {
      query.tripDate = {};

      if (filters.fromDate) query.tripDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.tripDate.$lte = new Date(filters.toDate);
    }

    return this.kmLogModel.find(query).sort({ tripDate: -1 }).exec();
  }

  async findOne(logId: string) {
    this.validateObjectId(logId, 'logId');

    const log = await this.kmLogModel.findOne({
      _id: new Types.ObjectId(logId),
      isDeleted: false,
    });

    if (!log) throw new NotFoundException('KM Log not found');

    return log;
  }

  async update(logId: string, dto: UpdateKmLogDto) {
    this.validateObjectId(logId, 'logId');

    const existing = await this.kmLogModel.findById(logId);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('KM Log not found');
    }

    const start = dto.startOdometerInKms ?? existing.startOdometerInKms;
    const end = dto.endOdometerInKms ?? existing.endOdometerInKms;

    const distanceInKms = this.calculateDistance(start, end);

    const updated = await this.kmLogModel
      .findByIdAndUpdate(
        logId,
        {
          $set: {
            ...dto,
            tripDate: dto.tripDate ? new Date(dto.tripDate) : existing.tripDate,
            distanceInKms,
          },
        },
        { new: true },
      )
      .exec();

    return updated;
  }

  async remove(logId: string) {
    this.validateObjectId(logId, 'logId');

    const log = await this.kmLogModel.findById(logId);
    if (!log || log.isDeleted) {
      throw new NotFoundException('KM Log not found');
    }

    await this.kmLogModel.findByIdAndUpdate(logId, {
      $set: { isDeleted: true },
    });

    return { message: 'KM Log deleted successfully' };
  }
}
