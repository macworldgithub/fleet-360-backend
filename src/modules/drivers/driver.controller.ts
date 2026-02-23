import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Post,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  // DRIVER MANAGEMENT APIs

  @Get()
  @ApiOperation({ summary: 'Get all drivers for the agency' })
  findAll(@Req() req) {
    const agencyId = req.user.agencyId;
    if (!agencyId) {
      throw new ForbiddenException('User is not associated with any agency');
    }
    return this.driverService.findAll(agencyId);
  }

  @Get(':driverId')
  @ApiOperation({ summary: 'Get a driver by ID' })
  findOne(@Req() req, @Param('driverId') driverId: string) {
    const agencyId = req.user.agencyId;
    if (!agencyId) {
      throw new ForbiddenException('User is not associated with any agency');
    }
    return this.driverService.findOne(driverId, agencyId);
  }

  @Patch(':driverId')
  @ApiOperation({ summary: 'Update a driver by ID' })
  update(
    @Req() req,
    @Param('driverId') driverId: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    const agencyId = req.user.agencyId;
    return this.driverService.update(driverId, updateDriverDto, agencyId);
  }

  @Delete(':driverId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a driver permanently' })
  async remove(@Req() req, @Param('driverId') driverId: string) {
    const agencyId = req.user.agencyId;
    await this.driverService.remove(driverId, agencyId);
    return { message: 'Driver deleted successfully' };
  }

  // DRIVER ASSIGNMENT APIs

  @Post(':driverId/assign-vehicle/:vehicleId')
  @ApiOperation({ summary: 'Assign a vehicle to a driver' })
  assignVehicle(
    @Req() req,
    @Param('driverId') driverId: string,
    @Param('vehicleId') vehicleId: string,
  ) {
    const agencyId = req.user.agencyId;
    return this.driverService.assignVehicle(driverId, vehicleId, agencyId);
  }

  @Post(':driverId/unassign-vehicle/:vehicleId')
  @ApiOperation({ summary: 'Unassign a vehicle from a driver' })
  unassignVehicle(
    @Req() req,
    @Param('driverId') driverId: string,
    @Param('vehicleId') vehicleId: string,
  ) {
    const agencyId = req.user.agencyId;
    return this.driverService.unassignVehicle(driverId, vehicleId, agencyId);
  }
}
