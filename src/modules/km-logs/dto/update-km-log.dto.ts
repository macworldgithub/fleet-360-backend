import { PartialType } from '@nestjs/swagger';
import { CreateKmLogDto } from './create-km-log.dto';

export class UpdateKmLogDto extends PartialType(CreateKmLogDto) {}
