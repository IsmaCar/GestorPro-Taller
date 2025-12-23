import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.db.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}
