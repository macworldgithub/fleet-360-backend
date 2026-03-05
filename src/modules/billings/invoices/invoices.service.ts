import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from './invoice.schema';

@Injectable()
export class InvoicesService {
  constructor(@InjectModel(Invoice.name) private invModel: Model<InvoiceDocument>) {}

  async create(invoiceData: Partial<Invoice>): Promise<Invoice> {
    const invoice = new this.invModel(invoiceData);
    return invoice.save();
  }

  async findAll(): Promise<Invoice[]> {
    return this.invModel.find().exec();
  }

  async findOne(id: string): Promise<Invoice | null> {
    return this.invModel.findById(id).exec();
  }
}