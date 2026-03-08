import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsBoolean } from 'class-validator';

export class RemoveVehiclePhotosDto {
  @ApiPropertyOptional({
    example: ['vehicles/123/side.jpg'],
    description: 'List of photo URLs to remove from the gallery',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Set to true to remove all gallery photos',
  })
  @IsBoolean()
  @IsOptional()
  deleteAll?: boolean;
}
