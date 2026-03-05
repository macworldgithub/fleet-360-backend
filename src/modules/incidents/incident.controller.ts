import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IncidentService } from './incident.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create Incident (with optional photo uploads)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('evidencePhotos', 5, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  create(
    @Req() req,
    @Query('vehicleId') vehicleId: string,
    @Body() dto: CreateIncidentDto,
    @UploadedFiles() evidencePhotos?: Express.Multer.File[],
  ) {
    const agencyId = req.user.agencyId;
    return this.incidentService.create(agencyId, vehicleId, dto, evidencePhotos);
  }

  @Get()
  @ApiOperation({ summary: 'Get all incidents' })
  findAll(
    @Req() req,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const agencyId = req.user.agencyId;
    return this.incidentService.findAll(agencyId, vehicleId);
  }

  @Get(':incidentId')
  @ApiOperation({ summary: 'Get incident by ID' })
  @ApiParam({ name: 'incidentId', description: 'Incident ObjectId' })
  findOne(@Req() req, @Param('incidentId') id: string) {
    const agencyId = req.user.agencyId;
    return this.incidentService.findOne(id, agencyId);
  }

  @Get(':incidentId/photos')
  @ApiOperation({ summary: 'Get signed URLs for all evidence photos' })
  @ApiParam({ name: 'incidentId', description: 'Incident ObjectId' })
  getPhotos(@Req() req, @Param('incidentId') id: string) {
    const agencyId = req.user.agencyId;
    return this.incidentService.getPhotos(id, agencyId);
  }

  @Post(':incidentId/photos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload additional photos to an existing incident' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'incidentId', description: 'Incident ObjectId' })
  @UseInterceptors(
    FilesInterceptor('evidencePhotos', 5, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  addPhotos(
    @Req() req,
    @Param('incidentId') id: string,
    @UploadedFiles() evidencePhotos: Express.Multer.File[],
  ) {
    const agencyId = req.user.agencyId;
    if (!evidencePhotos || evidencePhotos.length === 0) {
      throw new BadRequestException('At least one photo file is required');
    }
    return this.incidentService.addPhotos(id, agencyId, evidencePhotos);
  }

  @Delete(':incidentId/photos/:photoKey')
  @ApiOperation({ summary: 'Delete a specific photo from an incident' })
  @ApiParam({ name: 'incidentId', description: 'Incident ObjectId' })
  @ApiParam({ name: 'photoKey', description: 'S3 key of the photo to delete (URL-encoded)' })
  deletePhoto(
    @Req() req,
    @Param('incidentId') id: string,
    @Param('photoKey') photoKey: string,
  ) {
    const agencyId = req.user.agencyId;
    return this.incidentService.deletePhoto(id, agencyId, decodeURIComponent(photoKey));
  }

  @Patch(':incidentId')
  @ApiOperation({ summary: 'Update incident details' })
  @ApiParam({ name: 'incidentId', description: 'Incident ObjectId' })
  update(
    @Req() req,
    @Param('incidentId') id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    const agencyId = req.user.agencyId;
    return this.incidentService.update(id, dto, agencyId);
  }

  @Delete(':incidentId')
  @ApiOperation({ summary: 'Soft-delete an incident' })
  @ApiParam({ name: 'incidentId', description: 'Incident ObjectId' })
  remove(@Req() req, @Param('incidentId') id: string) {
    const agencyId = req.user.agencyId;
    return this.incidentService.remove(id, agencyId);
  }
}
