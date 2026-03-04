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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiParam } from '@nestjs/swagger';
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

  @Get(':driverId/profile-picture')
  @ApiOperation({ summary: 'Get signed URL for driver profile picture' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  async getProfilePicture(@Req() req, @Param('driverId') driverId: string) {
    const agencyId = req.user.agencyId;
    const url = await this.driverService.getProfilePictureUrl(driverId, agencyId);
    return { url };
  }

  @Patch(':driverId')
  @ApiOperation({ summary: 'Update a driver by ID (with optional profile picture)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('profilePicture'))
  update(
    @Req() req,
    @Param('driverId') driverId: string,
    @Body() updateDriverDto: UpdateDriverDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const agencyId = req.user.agencyId;
    return this.driverService.update(driverId, updateDriverDto, agencyId, file);
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

  // ─── Vehicle Request / Approval Workflow ─────────────────────────────────────

  @Post(':driverId/request-vehicle/:vehicleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Driver requests a vehicle' })
  requestVehicle(
    @Req() req,
    @Param('driverId') driverId: string,
    @Param('vehicleId') vehicleId: string,
  ) {
    const agencyId = req.user.agencyId;
    return this.driverService.requestVehicle(vehicleId, driverId, agencyId);
  }

  @Patch('approve-vehicle/:vehicleId')
  @ApiOperation({ summary: 'Approve a vehicle request' })
  approveVehicle(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    return this.driverService.approveVehicle(vehicleId, agencyId);
  }

  @Patch('reject-vehicle/:vehicleId')
  @ApiOperation({ summary: 'Reject a vehicle request' })
  rejectVehicle(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    return this.driverService.rejectVehicle(vehicleId, agencyId);
  }
}
