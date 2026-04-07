import { PartialType, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';
import {
  IsOptional,
  IsString,
  IsArray,
  IsNotEmpty,
  IsMongoId,
} from 'class-validator';

export class UpdateVehicleDto extends PartialType(
  OmitType(CreateVehicleDto, ['displayPhoto', 'vehiclePhotos'] as const),
) {
  @ApiPropertyOptional({
    description: 'Assign driver to vehicle',
    example: '69b0f6b1b514150b60c1ca83',
  })
  @IsOptional()
  @IsMongoId()
  currentDriverId?: string;
}

export class UpdateVehiclePhotosDto {
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    example: 'new-main.jpg',
  })
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
