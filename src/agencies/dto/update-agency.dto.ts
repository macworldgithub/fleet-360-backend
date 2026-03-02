import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAgencyDto } from './create-agency.dto';

export class UpdateAgencyDto extends PartialType(
  OmitType(CreateAgencyDto, ['password'] as const),
) {}
