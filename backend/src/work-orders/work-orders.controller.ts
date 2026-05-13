import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/user-id.decorator';
import { GarageId } from '../auth/decorators/garage-id.decorator';

@UseGuards(JwtAuthGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @HttpCode(201)
  @Post()
  create(
    @Body() createWorkOrderDto: CreateWorkOrderDto,
    @UserId() userId: string,
    @GarageId() garageId: string,
  ) {
    return this.workOrdersService.create(garageId, userId, createWorkOrderDto);
  }

  @HttpCode(200)
  @Get()
  findAll(@GarageId() garageId: string) {
    return this.workOrdersService.findAll(garageId);
  }
}
