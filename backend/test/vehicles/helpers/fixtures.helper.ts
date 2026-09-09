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

export const createVehicleFixtureDirect = async (
  prisma: PrismaService,
  garageId: string,
  clientId: string,
  overrides?: Partial<{ licensePlate: string; brand: string; model: string; color: string }>,
) => {
  const seed = Date.now().toString();

  return prisma.vehicle.create({
    data: {
      garageId,
      clientId,
      licensePlate: overrides?.licensePlate || `LIC${seed}`,
      brand: overrides?.brand || 'Toyota',
      model: overrides?.model || 'Corolla',
      color: overrides?.color || 'Black',
    },
  });
};

export const buildCreateVehiclePayload = (
  clientId: string,
  overrides?: Partial<{ licensePlate: string; brand: string; model: string; color: string }>,
) => {
  const seed = Date.now().toString();

  return {
    clientId,
    licensePlate: overrides?.licensePlate || `LIC${seed}`,
    brand: overrides?.brand || 'Toyota',
    model: overrides?.model || 'Corolla',
    color: overrides?.color || 'Black',
  };
};

export const buildInvalidVehiclePayload = () => ({
  clientId: '550e8400-e29b-41d4-a716-446655440000',
  licensePlate: 'INVALID-LIC',
  brand: 'Toyota',
  model: 'Corolla',
  color: 'Black',
});
