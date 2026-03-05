import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentType, IncidentStatus } from '../schemas/incident.schema';

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType })
  @IsEnum(IncidentType)
  incidentType: IncidentType;

  @ApiProperty({ example: '2026-02-20' })
  @IsDateString()
  incidentDate: string;

  @ApiProperty({ example: 'Melbourne CBD' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 'Front bumper damaged' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  damageSeverity?: string;

  @ApiPropertyOptional({ example: 3500 })
  @IsOptional()
  @IsNumber()
  estimatedRepairCost?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  insuranceClaimFiled?: boolean;

  @ApiPropertyOptional({ example: 'PR-12345' })
  @IsOptional()
  @IsString()
  policeReportNumber?: string;

  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Incident evidence photos (max 5)' })
  evidencePhotos?: any[];
}