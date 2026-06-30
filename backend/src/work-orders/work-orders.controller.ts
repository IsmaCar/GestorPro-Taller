import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/user-id.decorator';
import { GarageId } from '../auth/decorators/garage-id.decorator';
import { UpdateWorkOrderDto } from './dto/update-work-order';

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

  @HttpCode(200)
  @Get('/:id')
  findOne(@GarageId() garageId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.workOrdersService.findOne(garageId, id);
  }

  @HttpCode(200)
  @Patch('/:id')
  update(
    @Body() updateWorkOrderDto: UpdateWorkOrderDto,
    @GarageId() garageId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.workOrdersService.update(garageId, id, updateWorkOrderDto);
  }

  @HttpCode(204)
  @Delete('/:id')
  delete(@GarageId() garageId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.workOrdersService.delete(garageId, id);
  }
}
