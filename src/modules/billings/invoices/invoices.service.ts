import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from './invoice.schema';

@Injectable()
export class InvoicesService {
  constructor(@InjectModel(Invoice.name) private invModel: Model<InvoiceDocument>) {}

  async create(invoiceData: Partial<Invoice>): Promise<Invoice> {
    const invoice = new this.invModel(invoiceData);
    return invoice.save();
  }

  async findAll(agencyId?: string, role?: string): Promise<Invoice[]> {
    const isPrincipal = role === 'PRINCIPAL';
    const filter: any = {};
    
    if (!isPrincipal && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    } else if (isPrincipal && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    return this.invModel.find(filter).exec();
  }

  async findOne(id: string, agencyId?: string, role?: string): Promise<Invoice | null> {
    const filter: any = { _id: id };
    if (role !== 'PRINCIPAL' && agencyId) {
      filter.agencyId = new Types.ObjectId(agencyId);
    }

    return this.invModel.findOne(filter).exec();
  }
}