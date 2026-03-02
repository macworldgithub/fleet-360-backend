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

  @ApiPropertyOptional({ example: 15000 })
  @IsNumber()
  @IsOptional()
  residualValue?: number;

  @ApiPropertyOptional({ example: 'Commonwealth Bank' })
  @IsString()
  @IsOptional()
  loanProvider?: string;

  @ApiPropertyOptional({ example: 25000 })
  @IsNumber()
  @IsOptional()
  loanAmount?: number;

  @ApiPropertyOptional({ example: 6.49 })
  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsNumber()
  @IsOptional()
  loanTermMonths?: number;

  @ApiPropertyOptional({ example: 483.2 })
  @IsNumber()
  @IsOptional()
  monthlyLoanRepayment?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @IsOptional()
  balloonPayment?: number;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  loanStartDate?: string;

  @ApiPropertyOptional({ example: '2029-01-15' })
  @IsDateString()
  @IsOptional()
  loanEndDate?: string;

  @ApiPropertyOptional({ example: 'LN-778899' })
  @IsString()
  @IsOptional()
  lenderReferenceNumber?: string;

  @ApiPropertyOptional({ example: 'Secured' })
  @IsString()
  @IsOptional()
  loanType?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  insuranceRequired?: boolean;

  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @IsOptional()
  fbtValue?: number;

  @ApiPropertyOptional({ example: 0.15 })
  @IsNumber()
  @IsOptional()
  depreciationRate?: number;
}
