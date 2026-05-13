import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { Prisma, StateOrder, UserRole } from '@prisma/client';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(garageId: string) {
    return await this.prisma.workOrders.findMany({
      where: { garageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(garageId: string, userId: string, dto: CreateWorkOrderDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [vehicle, client] = await Promise.all([
          tx.vehicle.findFirst({
            where: { id: dto.vehicleId, garageId },
            select: { id: true, clientId: true },
          }),
          tx.client.findFirst({
            where: { id: dto.clientId, garageId },
            select: { id: true },
          }),
        ]);

        if (!vehicle) {
          throw new NotFoundException('Vehiculo no encontrado en tu taller');
        }

        if (!client) {
          throw new NotFoundException('Cliente no encontrado en tu taller');
        }

        if (vehicle.clientId !== dto.clientId) {
          throw new BadRequestException('El vehiculo no pertenece al cliente indicado');
        }

        if (dto.assignedMechanic) {
          const mechanic = await tx.user.findFirst({
            where: {
              id: dto.assignedMechanic,
              garageId,
              rol: { in: [UserRole.MECHANIC, UserRole.MANAGER] },
            },
            select: { id: true },
          });

          if (!mechanic) {
            throw new BadRequestException(
              'El mecanico asignado no existe o no pertenece a tu taller',
            );
          }
        }

        return tx.workOrders.create({
          data: {
            garageId,
            createdBy: userId,
            vehicleId: dto.vehicleId,
            clientId: dto.clientId,
            description: dto.description,
            assignedMechanic: dto.assignedMechanic ?? null,
            openingDate: dto.openingDate ? new Date(dto.openingDate) : undefined,
            state: StateOrder.OPEN,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException('Relacion invalida en IDs enviados');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Conflicto de datos al crear la orden');
        }
      }
      throw error;
    }
  }
}
