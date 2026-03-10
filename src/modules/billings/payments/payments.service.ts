// payments.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument, PaymentStatus } from './payment.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private payModel: Model<PaymentDocument>,
  ) {}

  async create(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = new this.payModel(paymentData);
    return payment.save();
  }

  async findAllWithSubscription(agencyId?: string, role?: string): Promise<Payment[]> {
    const isPrincipal = role === 'PRINCIPAL';
    const filter: any = {};
    
    if (!isPrincipal && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    } else if (isPrincipal && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    return this.payModel
      .find(filter)
      .populate({
        path: 'subscriptionId',      
        populate: [
          { path: 'planId' },        
          { path: 'agencyId' },      
        ],
      })
      .exec();
  }

  async findOneWithSubscription(id: string, agencyId?: string, role?: string): Promise<Payment | null> {
    const filter: any = { _id: id };
    if (role !== 'PRINCIPAL' && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    return this.payModel
      .findOne(filter)
      .populate({
        path: 'subscriptionId',
        populate: [
          { path: 'planId' },
          { path: 'agencyId' },
        ],
      })
      .exec();
  }

  async findByStripePaymentIntent(intentId: string) {
    return this.payModel.findOne({ stripePaymentIntentId: intentId }).exec();
  }

  async updateStatusByIntent(intentId: string, status: PaymentStatus, paidAt?: Date) {
    return this.payModel.findOneAndUpdate(
      { stripePaymentIntentId: intentId },
      { status, paidAt },
      { new: true },
    );
  }
}