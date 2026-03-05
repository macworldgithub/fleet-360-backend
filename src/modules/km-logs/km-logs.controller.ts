import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { KmLogsService } from './km-logs.service';
import { CreateKmLogDto } from './dto/create-km-log.dto';
import { UpdateKmLogDto } from './dto/update-km-log.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('KM Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/km-logs')
export class KmLogsController {
  constructor(private readonly kmLogsService: KmLogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a KM log (Trip log) with mandatory odometer photos' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'startOdometerPhoto', maxCount: 1 },
      { name: 'endOdometerPhoto', maxCount: 1 },
    ]),
  )
  create(
    @Req() req,
    @Body() dto: CreateKmLogDto,
    @UploadedFiles()
    files: {
      startOdometerPhoto?: Express.Multer.File[];
      endOdometerPhoto?: Express.Multer.File[];
    },
  ) {
    const agencyId = req.user.agencyId;

    if (!files?.startOdometerPhoto?.[0] || !files?.endOdometerPhoto?.[0]) {
      throw new BadRequestException(
        'Both startOdometerPhoto and endOdometerPhoto are mandatory',
      );
    }

    return this.kmLogsService.create(
      dto,
      agencyId,
      files.startOdometerPhoto[0],
      files.endOdometerPhoto[0],
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all KM logs (Trips)' })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'officeId', required: false })
  @ApiQuery({ name: 'tripType', required: false })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-02-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-02-18' })
  findAll(
    @Req() req,
    @Query('vehicleId') vehicleId?: string,
    @Query('officeId') officeId?: string,
    @Query('tripType') tripType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const agencyId = req.user.agencyId;
    return this.kmLogsService.findAll({
      vehicleId,
      agencyId,
      officeId,
      tripType,
      fromDate,
      toDate,
    });
  }

  @Get(':logId')
  @ApiOperation({ summary: 'Get KM log by ID' })
  @ApiParam({ name: 'logId', description: 'KM Log ID' })
  findOne(@Req() req, @Param('logId') logId: string) {
    const agencyId = req.user.agencyId;
    return this.kmLogsService.findOne(logId, agencyId);
  }

  @Patch(':logId')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update KM log by ID (Optional photo updates)' })
  @ApiParam({ name: 'logId', description: 'KM Log ID' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'startOdometerPhoto', maxCount: 1 },
      { name: 'endOdometerPhoto', maxCount: 1 },
    ]),
  )
  update(
    @Req() req,
    @Param('logId') logId: string,
    @Body() dto: UpdateKmLogDto,
    @UploadedFiles()
    files: {
      startOdometerPhoto?: Express.Multer.File[];
      endOdometerPhoto?: Express.Multer.File[];
    },
  ) {
    const agencyId = req.user.agencyId;
    return this.kmLogsService.update(
      logId,
      dto,
      agencyId,
      files?.startOdometerPhoto?.[0],
      files?.endOdometerPhoto?.[0],
    );
  }

  @Delete(':logId')
  @ApiOperation({ summary: 'Delete KM log by ID' })
  @ApiParam({ name: 'logId', description: 'KM Log ID' })
  remove(@Req() req, @Param('logId') logId: string) {
    const agencyId = req.user.agencyId;
    return this.kmLogsService.remove(logId, agencyId);
  }
}
