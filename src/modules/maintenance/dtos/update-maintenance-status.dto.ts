import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, ValidateIf } from 'class-validator';
import { MaintenanceStatus } from '../schemas/maintenance.schema';

export class UpdateMaintenanceStatusDto {
  @ApiProperty({ enum: MaintenanceStatus, description: 'The target status' })
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Actual cost of maintenance (required for COMPLETED status)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ValidateIf(o => o.status === MaintenanceStatus.COMPLETED)
  actualCost?: number;
}
