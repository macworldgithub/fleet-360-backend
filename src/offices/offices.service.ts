import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Office, OfficeDocument } from './schemas/office.schema';

@Injectable()
export class OfficesService {
  constructor(
    @InjectModel(Office.name) private officeModel: Model<OfficeDocument>,
  ) {}

  create(agencyId: string, data: Partial<Office>) {
    return this.officeModel.create({
      ...data,
      agencyId: new Types.ObjectId(agencyId),
    });
  }

  findByAgency(agencyId: string) {
    return this.officeModel
      .find({ agencyId: new Types.ObjectId(agencyId) })
      .populate('agencyId', 'agencyName contactEmail') // select only certain fields
      .exec();
  }
  findById(officeId: string) {
    return this.officeModel.findById(officeId).exec();
  }

  updateById(officeId: string, update: Partial<Office>) {
    return this.officeModel
      .findByIdAndUpdate(officeId, update, { new: true })
      .exec();
  }

  async deleteById(officeId: string) {
    const deleted = await this.officeModel.findByIdAndDelete(officeId);
    if (!deleted) throw new NotFoundException('Office not found');
  }
}
