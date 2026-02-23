import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AgencyRole } from '../../agencies/schemas/agency.schema';

export class AgencyRegisterDto {
  @ApiProperty({ example: 'Fleet Masters Pty Ltd' })
  @IsString()
  @IsNotEmpty()
  agencyName: string;

  @ApiProperty({ example: 'contact@fleetmasters.com.au' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: '+61 412 345 678' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiProperty({ example: 'securePass123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'FLEET_MANAGER',
    enum: AgencyRole,
    description: 'Role of the agency user (PRINCIPAL or FLEET_MANAGER)',
  })
  @IsEnum(AgencyRole)
  role: AgencyRole;

  @ApiPropertyOptional({ example: '12 345 678 901' })
  @IsOptional()
  @IsString()
  abn?: string;

  @ApiPropertyOptional({ example: '123 Collins Street, Melbourne' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Australia' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Victoria' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Melbourne' })
  @IsOptional()
  @IsString()
  city?: string;
}
