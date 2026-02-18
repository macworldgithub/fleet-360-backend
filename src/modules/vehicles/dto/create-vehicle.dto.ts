import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelType, LeaseType, VehicleStatus } from '../schemas/vehicle.schema';

export class CreateVehicleDto {
  @ApiProperty({ example: '1HGCM82633A004352' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2024 })
  @IsNumber()
  year: number;

  @ApiPropertyOptional({ example: 'White' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ enum: FuelType, example: FuelType.PETROL })
  @IsEnum(FuelType)
  fuelType: FuelType;

  @ApiPropertyOptional({ example: 15000 })
  @IsNumber()
  @IsOptional()
  odometerInKms?: number;

  @ApiPropertyOptional({ enum: VehicleStatus, example: VehicleStatus.ACTIVE })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 25000 })
  @IsNumber()
  @IsOptional()
  purchaseCost?: number;

  @ApiProperty({ enum: LeaseType, example: LeaseType.OWNED })
  @IsEnum(LeaseType)
  leaseType: LeaseType;

  @ApiPropertyOptional({ example: '2027-01-15' })
  @IsDateString()
  @IsOptional()
  leaseExpiryDate?: string;
}
