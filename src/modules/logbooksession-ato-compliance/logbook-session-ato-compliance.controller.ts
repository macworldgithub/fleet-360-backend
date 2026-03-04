import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { LogbookSessionAtoComplianceService } from './logbook-session-ato-compliance.service';
import { CreateLogbookSessionDto } from './dto/create-logbook-session.dto';

@ApiTags('Logbook Sessions (ATO Compliance)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/logbook-sessions')
export class LogbookSessionAtoComplianceController {
  constructor(private readonly service: LogbookSessionAtoComplianceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new ATO-compliant logbook session',
    description:
      'Creates a logbook session for a vehicle. Validates date range (≥ 84 days), ' +
      'checks for overlapping sessions, aggregates km data from existing KmLog trips, ' +
      'and attaches the session ID to matching trips.',
  })
  create(@Req() req, @Body() dto: CreateLogbookSessionDto) {
    const agencyId = req.user.agencyId;
    // Fallback to agencyId if userId is not present (for Agency admin accounts)
    const userId = req.user.userId || req.user._id || agencyId;
    return this.service.createLogbookSession(dto, agencyId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get logbook session by ID' })
  @ApiParam({ name: 'id', description: 'Logbook Session ID' })
  findOne(@Req() req, @Param('id') id: string) {
    const agencyId = req.user.agencyId;
    return this.service.getSessionById(id, agencyId);
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({
    summary: 'Get all logbook sessions for a vehicle',
    description: 'Returns sessions sorted by start date descending.',
  })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  findByVehicle(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    return this.service.getSessionsByVehicle(vehicleId, agencyId);
  }
}
