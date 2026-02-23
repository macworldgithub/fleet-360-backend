import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AgencyRole } from '../../agencies/schemas/agency.schema';

export class AgencyLoginDto {
  @ApiProperty({ example: 'contact@fleetmasters.com.au' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'FLEET_MANAGER',
    enum: AgencyRole,
    description: 'Role of the agency user (PRINCIPAL or FLEET_MANAGER)',
  })
  @IsEnum(AgencyRole)
  role: AgencyRole;
}
