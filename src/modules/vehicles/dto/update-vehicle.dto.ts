import { PartialType, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator';

export class UpdateVehicleDto extends PartialType(
  OmitType(CreateVehicleDto, ['displayPhoto', 'vehiclePhotos'] as const),
) {}

export class UpdateVehiclePhotosDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary', example: 'new-main.jpg' })
  @IsOptional()
  displayPhoto?: any;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    example: ['side.jpg', 'interior.jpg'],
  })
  @IsOptional()
  addPhotos?: any[];
}
