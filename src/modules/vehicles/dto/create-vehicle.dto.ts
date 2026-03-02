import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelType, LeaseType, VehicleStatus } from '../schemas/vehicle.schema';

export class CreateVehicleDto {
  @ApiProperty({ example: '1HGCM82633A004352' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiPropertyOptional({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsString()
  @IsOptional()
  officeId?: string;

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

  @ApiPropertyOptional({ enum: VehicleStatus, example: VehicleStatus.ACTIVATE })
  @IsEnum(VehicleStatus)
  @IsOptional()
  vehicleStatus?: VehicleStatus;

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

  @ApiPropertyOptional({ example: 'LeasePlan' })
  @IsString()
  @IsOptional()
  leaseProvider?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  leaseStartDate?: string;

  @ApiPropertyOptional({ example: 450.5 })
  @IsNumber()
  @IsOptional()
  monthlyLeasePayment?: number;

  @ApiPropertyOptional({ example: 60000 })
  @IsNumber()
  @IsOptional()
  leaseMileageAllowance?: number;

  @ApiPropertyOptional({ example: '36 months, 20k km/year' })
  @IsString()
  @IsOptional()
  leaseTerms?: string;

  @ApiPropertyOptional({ example: 15000 })
  @IsNumber()
  @IsOptional()
  residualValue?: number;

  @ApiPropertyOptional({ example: 'LSE-998877' })
  @IsString()
  @IsOptional()
  externalLeaseId?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @IsOptional()
  fbtValue?: number;

  @ApiPropertyOptional({ example: 0.15 })
  @IsNumber()
  @IsOptional()
  depreciationRate?: number;
}
