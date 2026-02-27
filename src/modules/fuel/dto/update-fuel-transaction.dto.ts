import { PartialType } from '@nestjs/swagger';
import { CreateFuelTransactionDto } from './create-fuel-transaction.dto';

export class UpdateFuelTransactionDto extends PartialType(
  CreateFuelTransactionDto,
) {}