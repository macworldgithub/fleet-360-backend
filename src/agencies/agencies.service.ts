import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Agency, AgencyDocument } from './schemas/agency.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectModel(Agency.name) private agencyModel: Model<AgencyDocument>,
  ) {}

  async create(data: any) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const { password, ...rest } = data;

    return this.agencyModel.create({
      ...rest,
      passwordHash,
    });
  }

  findByEmail(contactEmail: string) {
    return this.agencyModel.findOne({ contactEmail }).exec();
  }

  findByName(agencyName: string) {
    const trimmedName = agencyName.trim();
    return this.agencyModel
      .findOne({ agencyName: { $regex: new RegExp(`^${trimmedName}$`, 'i') } })
      .exec();
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
