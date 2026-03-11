import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripType } from '../schemas/km-log.schema';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ example: -37.8136 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 144.9631 })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: 'Melbourne CBD' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateKmLogDto {
  @ApiProperty({ example: '69942fa3c94c1a92c87d5e53' })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiPropertyOptional({ example: '69942fa3c94c1a92c87d5e53' })
  @IsOptional()
  @IsString()
  agencyId?: string;

  @ApiPropertyOptional({ example: '69942fa3c94c1a92c87d5e53' })
  @IsOptional()
  @IsString()
  officeId?: string;

  @ApiProperty({ example: '2026-02-18' })
  @IsDateString()
  tripDate: string;

  @ApiProperty({ example: 12000 })
  @Type(() => Number)
  @IsNumber()
  startOdometerInKms: number;

  @ApiProperty({ example: 12040 })
  @Type(() => Number)
  @IsNumber()
  endOdometerInKms: number;

  @ApiProperty({ enum: TripType, example: TripType.BUSINESS })
  @IsEnum(TripType)
  tripType: TripType;

  @ApiPropertyOptional({ example: 'Client visit trip' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Meeting with client at their office' })
  @IsOptional()
  @IsString()
  businessPurpose?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Photo of the odometer at the start of the trip' })
  startOdometerPhoto: any;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Photo of the odometer at the end of the trip' })
  endOdometerPhoto: any;
}
