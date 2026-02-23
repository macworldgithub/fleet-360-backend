import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Agency, AgencyDocument } from './schemas/agency.schema';
import { Model } from 'mongoose';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectModel(Agency.name) private agencyModel: Model<AgencyDocument>,
  ) {}

  create(data: Partial<Agency>) {
    return this.agencyModel.create(data);
  }

  findByEmail(contactEmail: string) {
    return this.agencyModel.findOne({ contactEmail }).exec();
  }

  findByName(agencyName: string) {
    return this.agencyModel.findOne({ agencyName }).exec();
  }

  findAll() {
    return this.agencyModel.find().exec();
  }

  findById(id: string) {
    return this.agencyModel.findById(id).exec();
  }

  updateById(id: string, update: Partial<Agency>) {
    return this.agencyModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async deleteById(id: string) {
    const deleted = await this.agencyModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Agency not found');
  }

  findByResetToken(tokenHash: string) {
    return this.agencyModel
      .findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: { $gt: new Date() },
      })
      .exec();
  }

  findByVerificationToken(tokenHash: string) {
    return this.agencyModel
      .findOne({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
      })
      .exec();
  }
}
