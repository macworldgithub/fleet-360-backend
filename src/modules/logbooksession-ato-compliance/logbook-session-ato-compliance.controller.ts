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
import { LockLogbookSessionDto } from './dto/lock-logbook-session.dto';

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
    const userId = req.user.userId;
    return this.service.createLogbookSession(dto, agencyId, userId);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lock a logbook session',
    description:
      'Locks the session so no further edits can be made. ' +
      'Requires the minimum ATO period to be satisfied.',
  })
  @ApiParam({ name: 'id', description: 'Logbook Session ID' })
  lock(@Param('id') id: string, @Body() dto: LockLogbookSessionDto) {
    return this.service.lockLogbookSession(id, dto.userId);
  }

  @Get(':id/audits')
  @ApiOperation({
    summary: 'Get audit trail for a logbook session',
    description:
      'Returns all audit records (CREATE, LOCK) for a session, sorted by most recent first.',
  })
  @ApiParam({ name: 'id', description: 'Logbook Session ID' })
  getAudits(@Param('id') id: string) {
    return this.service.getAuditsBySession(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get logbook session by ID' })
  @ApiParam({ name: 'id', description: 'Logbook Session ID' })
  findOne(@Param('id') id: string) {
    return this.service.getSessionById(id);
  }

  @Get('live/:vehicleId')
  @ApiOperation({
    summary: 'Get live logbook summary for a vehicle',
    description:
      'Returns the current active (unlocked) session with real-time totals and trip list.',
  })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  getLiveSummary(@Param('vehicleId') vehicleId: string) {
    return this.service.getLiveSummary(vehicleId);
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({
    summary: 'Get all logbook sessions for a vehicle',
    description: 'Returns sessions sorted by start date descending.',
  })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.service.getSessionsByVehicle(vehicleId);
  }
}
