import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.db.dto';
import { UpdateClientDto } from './dto/update-client,db.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    const garageId = 'hardcoded-garage-id'; //Temporal
    return this.clientsService.create(garageId, createClientDto);
  }

  @Get()
  findAll() {
    const garageId = 'hardcoded-garage-id'; //Temporal
    return this.clientsService.findAll(garageId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const garageId = 'hardcoded-garage-id'; //Temporal
    return this.clientsService.findOne(garageId, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDTO: UpdateClientDto) {
    const garageId = 'hardcoded-garage-id'; //Temporal
    return this.clientsService.update(garageId, id, updateClientDTO);
  }
}
