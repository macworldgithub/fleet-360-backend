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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto, UpdateVehiclePhotosDto } from './dto/update-vehicle.dto';
import { RemoveVehiclePhotosDto } from './dto/remove-vehicle-photos.dto';
import { LoanRepaymentDto } from './dto/loan-repayment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new vehicle with binary photo uploads' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'displayPhoto', maxCount: 1 },
      { name: 'vehiclePhotos', maxCount: 10 },
    ]),
  )
  create(
    @Req() req,
    @Body() createVehicleDto: CreateVehicleDto,
    @UploadedFiles()
    files: {
      displayPhoto?: Express.Multer.File[];
      vehiclePhotos?: Express.Multer.File[];
    },
  ) {
    const agencyId = req.user.agencyId;
    const userId = req.user.agencyId || req.user.userId;

    if (!files?.displayPhoto?.[0]) {
      throw new BadRequestException('displayPhoto is mandatory');
    }

    return this.vehicleService.create(
      createVehicleDto,
      agencyId,
      userId,
      files.displayPhoto[0],
      files.vehiclePhotos,
    );
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

  @Patch(':vehicleId/loan-repayment')
  @ApiOperation({
    summary: 'Make a loan repayment — deducts amount from vehicle loanAmount (LOAN vehicles only)',
  })
  makeLoanRepayment(
    @Req() req,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: LoanRepaymentDto,
  ) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.makeLoanRepayment(vehicleId, dto.amount, agencyId);
  }

  @Get(':vehicleId/loan-history')
  @ApiOperation({
    summary: 'Get loan repayment history for a vehicle',
  })
  getLoanHistory(@Req() req, @Param('vehicleId') vehicleId: string) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.getLoanRepaymentHistory(vehicleId, agencyId);
  }

  @Patch(':vehicleId/photos')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update vehicle display photo or append gallery photos (Binary upload)',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'displayPhoto', maxCount: 1 },
      { name: 'addPhotos', maxCount: 10 },
    ]),
  )
  updatePhotos(
    @Req() req,
    @Param('vehicleId') vehicleId: string,
    @UploadedFiles()
    files: {
      displayPhoto?: Express.Multer.File[];
      addPhotos?: Express.Multer.File[];
    },
  ) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.updateVehiclePhotos(
      vehicleId,
      agencyId,
      files?.displayPhoto?.[0],
      files?.addPhotos,
    );
  }

  @Delete(':vehicleId/gallery')
  @ApiOperation({
    summary: 'Remove specific gallery photos or all gallery photos',
  })
  removeGalleryPhotos(
    @Req() req,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: RemoveVehiclePhotosDto,
  ) {
    const agencyId = req.user.agencyId;
    return this.vehicleService.removeVehiclePhotos(vehicleId, dto, agencyId);
  }
}
