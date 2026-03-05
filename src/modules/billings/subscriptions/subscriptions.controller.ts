import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './create-subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subService: SubscriptionsService) {}

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subService.create(dto);
  }

  @Get()
  findAll() {
    return this.subService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subService.findOne(id);
  }
}