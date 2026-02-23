import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { SubscriptionTier, AgencyRole } from '../schemas/agency.schema';

export class CreateAgencyDto {
  @ApiProperty({ example: 'Fleet Masters Pty Ltd' })
  @IsString()
  @IsNotEmpty()
  agencyName: string;

  @ApiPropertyOptional({ example: 'Real Estate Agency' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: '12 345 678 901' })
  @IsOptional()
  @IsString()
  abn?: string;

  @ApiProperty({ example: 'contact@fleetmasters.com.au' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: '+61 412 345 678' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

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

  @ApiPropertyOptional({ enum: SubscriptionTier, example: SubscriptionTier.ESSENTIAL })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @ApiPropertyOptional({
    enum: AgencyRole,
    example: AgencyRole.FLEET_MANAGER,
    description: 'Role of the agency user (PRINCIPAL or FLEET_MANAGER)',
  })
  @IsOptional()
  @IsEnum(AgencyRole)
  role?: AgencyRole;
}
