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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.create(createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiQuery({ name: 'officeId', required: false, description: 'Filter by office ID' })
  findAll(@Query('officeId') officeId?: string) {
    return this.vehicleService.findAll(officeId);
  }

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  findOne(@Param('vehicleId') vehicleId: string) {
    return this.vehicleService.findOne(vehicleId);
  }

  @Patch(':vehicleId')
  @ApiOperation({ summary: 'Update a vehicle by ID' })
  update(
    @Param('vehicleId') vehicleId: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehicleService.update(vehicleId, updateVehicleDto);
  }

  @Delete(':vehicleId')
  @ApiOperation({ summary: 'Delete a Vehicle' })
  remove(@Param('vehicleId') vehicleId: string) {
    return this.vehicleService.remove(vehicleId);
  }

  @Patch(':vehicleId/toggle-status')
  @ApiOperation({ summary: 'Toggle vehicle status between ACTIVATE and DEACTIVATE' })
  toggleStatus(@Param('vehicleId') vehicleId: string) {
    return this.vehicleService.toggleStatus(vehicleId);
  }
}
