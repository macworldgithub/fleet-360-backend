import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLogbookSessionDto {
  @ApiProperty({
    example: '69942fa3c94c1a92c87d5e53',
    description: 'Vehicle ObjectId',
  })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({
    example: '69942fa3c94c1a92c87d5e53',
    description: 'Agency ObjectId',
  })
  @IsString()
  @IsNotEmpty()
  agencyId: string;

  @ApiProperty({
    example: '2025-04-01',
    description: 'Start date of the logbook period (inclusive)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2025-06-30',
    description: 'End date of the logbook period (inclusive). Optional for live sessions.',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    example: '2025-2026',
    description: 'FBT year string (Australian FBT year: 1 Apr – 31 Mar)',
  })
  @IsString()
  @IsNotEmpty()
  fbtYear: string;

  @ApiProperty({
    example: '69942fa3c94c1a92c87d5e53',
    description: 'User who is creating this session',
  })
  @IsString()
  @IsNotEmpty()
  performedBy: string;
}
