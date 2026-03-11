// src/offices/dto/create-office.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOfficeDto {
  @ApiProperty({ description: 'Name of the office' })
  @IsString()
  @IsNotEmpty()
  officeName: string;

  @ApiProperty({ description: 'Type of the office' })
  @IsString()
  @IsNotEmpty()
  officeType: string;

  @ApiProperty({ description: 'Office Hours' })
  @IsString()
  @IsNotEmpty()
  officeHours: string;

  @ApiProperty({ description: 'Address of the office', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'City of the office', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'State of the office', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Country of the office', required: false })
  @IsString()
  @IsOptional()
  country?: string;
}
