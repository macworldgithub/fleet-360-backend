// payments.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument, PaymentStatus } from './payment.schema';

@Injectable()
export class PaymentsService {
  constructor(@InjectModel(Payment.name) private payModel: Model<PaymentDocument>) {}

  async create(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = new this.payModel(paymentData);
    return payment.save();
  }

  async findAll(): Promise<Payment[]> {
    return this.payModel.find().exec();
  }

  async findOne(id: string): Promise<Payment | null> { return this.payModel.findById(id).exec(); }
  
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