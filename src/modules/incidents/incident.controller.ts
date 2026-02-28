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
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
// import { FilesInterceptor } from '@nestjs/platform-express'; 
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
  @ApiOperation({ summary: 'Create Incident' })
  create(
    @Req() req,
    @Query('vehicleId') vehicleId: string,
    @Body() dto: CreateIncidentDto,
  ) {
    const agencyId = req.user.agencyId;
    return this.incidentService.create(agencyId, vehicleId, dto);
  }

  @Get()
  findAll(
    @Req() req,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const agencyId = req.user.agencyId;
    return this.incidentService.findAll(agencyId, vehicleId);
  }

  @Get(':incidentId')
  findOne(@Req() req, @Param('incidentId') id: string) {
    const agencyId = req.user.agencyId;
    return this.incidentService.findOne(id, agencyId);
  }

  @Patch(':incidentId')
  update(
    @Req() req,
    @Param('incidentId') id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    const agencyId = req.user.agencyId;
    return this.incidentService.update(id, dto, agencyId);
  }

  @Delete(':incidentId')
  remove(@Req() req, @Param('incidentId') id: string) {
    const agencyId = req.user.agencyId;
    return this.incidentService.remove(id, agencyId);
  }
}
