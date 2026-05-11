import { Controller, Get, HttpCode } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @HttpCode(200)
  @Get()
  findAll() {
    const garageId = 'hardcoded-garage-id'; //Temporal
    return this.workOrdersService.findAll(garageId);
  }
}
