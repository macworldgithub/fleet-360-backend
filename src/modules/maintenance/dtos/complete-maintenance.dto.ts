import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteMaintenanceDto {
  @ApiProperty({ example: 320, description: 'Actual cost of the maintenance' })
  @IsNumber()
  @IsNotEmpty()
  actualCost: number;
}
