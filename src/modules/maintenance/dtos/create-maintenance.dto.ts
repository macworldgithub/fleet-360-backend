import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceType } from '../schemas/maintenance.schema';

export class CreateMaintenanceDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Vehicle ObjectId',
  })
  @IsMongoId()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({
    enum: MaintenanceType,
    description: 'Type of maintenance',
    example: MaintenanceType.OIL_CHANGE,
  })
  @IsEnum(MaintenanceType)
  @IsNotEmpty()
  maintenanceType: MaintenanceType;

  @ApiPropertyOptional({ example: 'Routine oil change at 50,000 km' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 250 })
  @IsNumber()
  @IsOptional()
  estimatedCost?: number;
}
