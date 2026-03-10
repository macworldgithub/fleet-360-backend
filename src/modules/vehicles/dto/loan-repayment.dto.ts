import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class LoanRepaymentDto {
  @ApiProperty({ example: 500, description: 'Amount to deduct from the loan' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
