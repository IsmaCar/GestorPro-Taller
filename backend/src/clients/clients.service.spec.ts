import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ClientsService', () => {
  // Variables compartidas entre todos los tests
  let service: ClientsService; // Instancia del service a testear
  let mockPrismaService: any; // Mock (simulador) de PrismaService - no usa BD real

  // beforeEach: se ejecuta ANTES de cada test para tener un estado limpio
  beforeEach(async () => {
    // Crear mock de PrismaService - objeto falso que simula Prisma sin tocar la BD real
    mockPrismaService = {
      client: {
        create: jest.fn(), // jest.fn() crea una función mock que podemos espiar y controlar
        findMany: jest.fn(), // Simula el método findMany de Prisma
        findFirst: jest.fn(), // Simula el método findFirst de Prisma
      },
    };

    // Crear módulo de testing aislado (similar a un AppModule pero para tests)
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService, // Registrar el service a testear
        {
          // Inyección de dependencias: cuando alguien pida PrismaService...
          provide: PrismaService,
          useValue: mockPrismaService, // ...darle el mock en vez del real
        },
      ],
    }).compile();

    // Obtener la instancia del service desde el módulo de testing
    service = module.get<ClientsService>(ClientsService);
  });

  // Test básico: verifica que el service se creó correctamente
  it('should be defined', () => {
    expect(service).toBeDefined(); // Verifica que service NO sea null o undefined
  });

  // Suite de tests específicos para el método create()
  describe('create', () => {
    // Test: verificar que create() funciona correctamente en caso exitoso
    it('should create a client correctly', async () => {
      // Datos de entrada para el test
      const garageId = 'test-garage-id'; // ID del garage (tenant)
      const createClientDto = {
        name: 'Juan Pérez',
        email: 'juan@test.com',
        phone: '123456789',
      };

      // Resultado esperado después del INSERT (lo que Prisma devolvería)
      const expectedResult = {
        id: 'generated-uuid', // UUID que la BD generaría
        ...createClientDto, // Expande: name, email, phone
        garageId, // Se añade al crear (multi-tenancy)
        createdAt: new Date(), // Timestamp de creación
        updatedAt: new Date(), // Timestamp de actualización
      };

      // Configurar el mock: "cuando llamen a create(), devuelve expectedResult"
      mockPrismaService.client.create.mockResolvedValue(expectedResult);

      // Ejecutar el método real del service (que usa el mock internamente)
      const result = await service.create(garageId, createClientDto);

      // Verificar que el resultado es exactamente lo esperado
      expect(result).toEqual(expectedResult);

      // Verificar que el mock se llamó con los parámetros correctos
      expect(mockPrismaService.client.create).toHaveBeenCalledWith({
        data: { ...createClientDto, garageId }, // Debe incluir garageId (seguridad multi-tenant)
      });
    });
  });

  describe('findAll', () => {
    it('should find all clients of garage', async () => {
      const garageId = 'test-garage-id';
      const expectedResult = [
        {
          id: '1',
          name: 'Juan',
          email: 'juan@test.com',
          phone: '123456789',
          garageId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'María',
          email: 'maria@test.com',
          phone: '123456789',
          garageId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      // Configurar mock: cuando llamen a findMany, devuelve el resultado (array clientes)
      mockPrismaService.client.findMany.mockResolvedValue(expectedResult);

      // Ejecuta el método
      const result = await service.findAll(garageId);

      // Verificar el resultado
      expect(result).toEqual(expectedResult);

      //Verificar que se llamó con los parámetros correctos
      expect(mockPrismaService.client.findMany).toHaveBeenCalledWith({
        where: { garageId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should find client of the search', async () => {
      const garageId = 'test-garage-id';
      const id = 'client-uuid-123';
      const expectedResult = {
        id,
        name: 'Juan',
        email: 'juan@test.com',
        phone: '123456789',
        garageId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.client.findFirst.mockResolvedValue(expectedResult);

      const result = await service.findOne(garageId, id);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.client.findFirst).toHaveBeenCalledWith({
        where: { id, garageId },
      });
    });
  });
});
