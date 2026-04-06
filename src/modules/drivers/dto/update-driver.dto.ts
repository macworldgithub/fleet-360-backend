import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'James Wilson' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'james.wilson@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+61 400 123 456' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'DL-2024-78901' })
  @IsString()
  @IsOptional()
  driverLicenseNumber?: string;

  @ApiPropertyOptional({ example: '11-1-2022' })
  @IsOptional()
  licenseExpiryDate?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  profilePicture?: any;
}
