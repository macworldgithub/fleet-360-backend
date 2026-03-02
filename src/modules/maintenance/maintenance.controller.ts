import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dtos/create-maintenance.dto';
import { CompleteMaintenanceDto } from './dtos/complete-maintenance.dto';
import { MaintenanceStatus } from './schemas/maintenance.schema';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all maintenance records (Agency context)',
    description:
      'Returns all maintenance records for the authenticated agency. Can be filtered by status.',
  })
  @ApiQuery({
    name: 'status',
    enum: MaintenanceStatus,
    required: false,
    description: 'Filter by maintenance status',
  })
  findAll(@Req() req, @Query('status') status?: MaintenanceStatus) {
    const agencyId = req.user.agencyId;
    return this.maintenanceService.findAll(agencyId, status);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new maintenance request' })
  create(@Req() req, @Body() dto: CreateMaintenanceDto) {
    const userId = req.user.agencyId || req.user.userId;
    const agencyId = req.user.agencyId;
    return this.maintenanceService.create(dto, userId, agencyId);
  }

  @Patch(':id/submit')
  @ApiOperation({
    summary: 'Submit a maintenance request (creator only, DRAFT → SUBMITTED)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance ID' })
  submit(@Req() req, @Param('id') id: string) {
    const userId = req.user.agencyId || req.user.userId;
    return this.maintenanceService.submit(id, userId);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary:
      'Approve a maintenance request (PRINCIPAL/FLEET_MANAGER, SUBMITTED → APPROVED)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance ID' })
  approve(@Req() req, @Param('id') id: string) {
    const userId = req.user.agencyId || req.user.userId;
    const role = req.user.role;
    return this.maintenanceService.approve(id, userId, role);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary:
      'Reject a maintenance request (PRINCIPAL/FLEET_MANAGER, SUBMITTED → REJECTED)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance ID' })
  reject(@Req() req, @Param('id') id: string) {
    const userId = req.user.agencyId || req.user.userId;
    const role = req.user.role;
    return this.maintenanceService.reject(id, userId, role);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Complete a maintenance request (APPROVED → COMPLETED)',
  })
  @ApiParam({ name: 'id', description: 'Maintenance ID' })
  complete(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CompleteMaintenanceDto,
  ) {
    const userId = req.user.agencyId || req.user.userId;
    return this.maintenanceService.complete(id, userId, dto.actualCost);
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Get all maintenance records for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.maintenanceService.findByVehicle(vehicleId);
  }
}
