import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IncidentService } from './incident.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('photos', 5))
  @ApiOperation({ summary: 'Create Incident (with photo upload)' })
  create(
    @Query('agencyId') agencyId: string,
    @Query('vehicleId') vehicleId: string,
    @Body() dto: CreateIncidentDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    return this.incidentService.create(agencyId, vehicleId, dto, photos);
  }

  @Get()
  findAll(
    @Query('agencyId') agencyId?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.incidentService.findAll({ agencyId, vehicleId });
  }

  @Get(':incidentId')
  findOne(@Param('incidentId') id: string) {
    return this.incidentService.findOne(id);
  }

  @Patch(':incidentId')
  update(@Param('incidentId') id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidentService.update(id, dto);
  }

  @Delete(':incidentId')
  remove(@Param('incidentId') id: string) {
    return this.incidentService.remove(id);
  }
}
