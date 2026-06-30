import { PrismaService } from '../../../src/prisma/prisma.service';

export const createClientFixture = async (prisma: PrismaService, garageId: string) => {
  const seed = Date.now().toString();

  return prisma.client.create({
    data: {
      garageId,
      name: 'Juan Perez',
      email: `juan${seed}@gmail.com`,
      phone: '123456789',
    },
  });
};

export const createVehicleFixture = async (
  prisma: PrismaService,
  garageId: string,
  clientId: string,
) => {
  const seed = Date.now().toString();

  return prisma.vehicle.create({
    data: {
      licensePlate: seed,
      brand: 'Toyota',
      model: 'Corolla',
      garageId,
      clientId,
    },
  });
};

export const buildWorkOrderPayload = (clientId: string, vehicleId: string) => ({
  clientId,
  vehicleId,
  description: 'Test work order',
  openingDate: new Date().toISOString(),
});

export const buildInvalidWorkOrderPayload = () => ({
  clientId: '550e8400-e29b-41d4-a716-446655440000',
  vehicleId: '550e8400-e29c-23c4-a718-446655440000',
  description: 'Test work order',
  openingDate: new Date().toISOString(),
});
