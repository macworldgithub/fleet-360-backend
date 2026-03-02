import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';
import {
  FuelTransaction,
  FuelTransactionSchema,
} from './schemas/fuel-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FuelTransaction.name, schema: FuelTransactionSchema },
    ]),
  ],
  controllers: [FuelController],
  providers: [FuelService],
})
export class FuelModule {}