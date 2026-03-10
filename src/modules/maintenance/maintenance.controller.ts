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
  BadRequestException,
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
import { UpdateMaintenanceStatusDto } from './dtos/update-maintenance-status.dto';
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
    const role = req.user.role;
    return this.maintenanceService.findAll(agencyId, status, role);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new maintenance request' })
  create(@Req() req, @Body() dto: CreateMaintenanceDto) {
    const agencyId = req.user.agencyId;
    const userId = req.user.userId || req.user._id || agencyId;
    return this.maintenanceService.create(dto, userId, agencyId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update maintenance status (Dispatcher: APPROVE, REJECT, or COMPLETE)',
    description: 'A single endpoint to handle status transitions. Logic varies based on the status provided.',
  })
  @ApiParam({ name: 'id', description: 'Maintenance ID' })
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
  ) {
    const agencyId = req.user.agencyId;
    const userId = req.user.userId || req.user._id || agencyId;
    const role = req.user.role;

    switch (dto.status) {
      case MaintenanceStatus.APPROVED:
        return this.maintenanceService.approve(id, userId, role);
      case MaintenanceStatus.REJECTED:
        return this.maintenanceService.reject(id, userId, role);
      case MaintenanceStatus.COMPLETED:
        if (dto.actualCost === undefined) {
          throw new BadRequestException('actualCost is required for COMPLETED status');
        }
        return this.maintenanceService.complete(id, userId, dto.actualCost);
      default:
        throw new BadRequestException(`Unsupported status transition: ${dto.status}`);
    }
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Get all maintenance records for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  findByVehicle(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.maintenanceService.findByVehicle(vehicleId, agencyId, role);
  }
}
