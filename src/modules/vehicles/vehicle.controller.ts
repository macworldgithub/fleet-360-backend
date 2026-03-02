import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vehicle' })
  create(@Req() req, @Body() createVehicleDto: CreateVehicleDto) {
    const agencyId = req.user.agencyId;
    const userId = req.user.agencyId || req.user.userId;
    return this.vehicleService.create(createVehicleDto, agencyId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiQuery({
    name: 'officeId',
    required: false,
    description: 'Filter by office ID',
  })
  findAll(@Req() req, @Query('officeId') officeId?: string) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.findAll(agencyId, officeId);
  }

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  findOne(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.findOne(vehicleId, agencyId);
  }

  @Patch(':vehicleId')
  @ApiOperation({ summary: 'Update a vehicle by ID' })
  update(
    @Req() req,
    @Param('vehicleId') vehicleId: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.update(vehicleId, updateVehicleDto, agencyId);
  }

  @Delete(':vehicleId')
  @ApiOperation({ summary: 'Delete a Vehicle' })
  remove(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.remove(vehicleId, agencyId);
  }

  @Patch(':vehicleId/toggle-status')
  @ApiOperation({
    summary: 'Toggle vehicle status between ACTIVATE and DEACTIVATE',
  })
  toggleStatus(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.toggleStatus(vehicleId, agencyId);
  }
}
