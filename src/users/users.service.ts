import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  findById(userId: string) {
    return this.userModel.findById(userId).exec();
  }

  updateById(userId: string, update: Partial<User>) {
    return this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .exec();
  }

  async deleteById(userId: string): Promise<void> {
    const deleted = await this.userModel.findByIdAndDelete(userId);
    if (!deleted) throw new NotFoundException('User not found');
  }

  updateByEmail(email: string, update: Partial<User>) {
    return this.userModel
      .findOneAndUpdate({ email }, update, { new: true })
      .exec();
  }

  findByResetToken(tokenHash: string) {
    return this.userModel
      .findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: { $gt: new Date() },
      })
      .exec();
  }

  findByVerificationToken(tokenHash: string) {
    return this.userModel
      .findOne({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
      })
      .exec();
  }
}
