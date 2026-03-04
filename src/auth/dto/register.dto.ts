import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum UserRole {
  DRIVER = 'DRIVER',
  PASSENGER = 'PASSENGER',
}

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'DRIVER', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: '+61 400 123 456' })
  @ValidateIf((o) => o.role === UserRole.DRIVER)
  @IsString()
  @IsNotEmpty()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'DL-2024-78901' })
  @ValidateIf((o) => o.role === UserRole.DRIVER)
  @IsString()
  @IsNotEmpty()
  driverLicenseNumber?: string;

  @ApiPropertyOptional({ example: 'Fleet Masters Pty Ltd' })
  @ValidateIf((o) => o.role === UserRole.DRIVER)
  @IsString()
  @IsNotEmpty()
  agencyName?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  profilePicture?: any;
}
