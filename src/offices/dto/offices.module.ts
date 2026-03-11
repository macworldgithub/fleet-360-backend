import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfficesController } from './offices.controller';
import { OfficesService } from '../offices.service';
import { Office, OfficeSchema } from '../schemas/office.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Office.name, schema: OfficeSchema }]),
  ],
  providers: [OfficesService],
  controllers: [OfficesController],
})
export class OfficesModule {}
