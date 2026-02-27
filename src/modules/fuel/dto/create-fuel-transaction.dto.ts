import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFuelTransactionDto {
  @ApiProperty()
  @IsString()
  agencyId: string;

  @ApiProperty()
  @IsString()
  vehicleId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fuelCardNumber?: string;

  @ApiProperty()
  @IsDateString()
  fuelDate: string;

  @ApiProperty()
  @IsNumber()
  liters: number;

  @ApiProperty()
  @IsNumber()
  pricePerLiter: number;

  @ApiProperty()
  @IsNumber()
  totalCost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  odometer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverName?: string;
}