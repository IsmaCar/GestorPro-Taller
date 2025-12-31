import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.db.dto';
import { Prisma } from 'generated/prisma';
import { UpdateClientDto } from './dto/update-client,db.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(garageId: string, createClientDto: CreateClientDto) {
    try {
      return await this.prisma.client.create({
        data: {
          ...createClientDto,
          garageId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Client with this email already exist in this garage');
        }
      }
    }
  }

  async findAll(garageId: string) {
    return await this.prisma.client.findMany({
      where: { garageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(garageId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, garageId },
    });

    if (!client) {
      throw new NotFoundException(`Client whit ID ${id} not found`);
    }

    return client;
  }

  async update(garageId: string, id: string, updateClientDTO: UpdateClientDto) {
    try {
      await this.findOne(garageId, id);

      return await this.prisma.client.update({
        where: { id },
        data: updateClientDTO,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Error updating client data');
        }
        throw error;
      }
    }
  }
}
