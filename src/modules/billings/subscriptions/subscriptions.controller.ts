import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './create-subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subService: SubscriptionsService) {}

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subService.create(dto);
  }

  @Get()
  findAll(@Req() req) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.subService.findAll(agencyId, role);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.subService.findOne(id, agencyId, role);
  }
}