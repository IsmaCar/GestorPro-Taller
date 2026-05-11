import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(garageId: string) {
    return await this.prisma.workOrders.findMany({
      where: { garageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(garageId: string, userId: string, createWorkOrder: CreateWorkOrderDto) {
    try {
      return await this.prisma.workOrders.create({
        data: {
          ...createWorkOrder,
          garageId,
          createdBy: userId,
        },
      });
    } catch (error) {}
  }
}
