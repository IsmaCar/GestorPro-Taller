import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import request from 'supertest';

//Suite de test para el módulo work-orders
describe('Work-order (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    //1. Crear el módulo test y app para iniciarlo
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    //2. Crear reglas para los test
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // 3. Obtener servicio de prisma e inicializar la app.
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Limpiar la base de datos en cada test
    await prisma.workOrders.deleteMany({});
  });

  afterAll(async () => {
    // Cerrar la aplicación y los test al terminarlos
    if (app) {
      await app.close();
    }
  });

  // Verificar entrada autenticada
  describe('POST /work-orders', () => {
    it('should return 401 when no token is provided', async () => {
      const data = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        vehicleId: '550e8400-e29c-23c4-a718-446655440000',
        description: 'Test work order',
        // assignedMechanic omitido (opcional)
        openingDate: new Date().toISOString(),
        // el state se asigna automáticamente en el backend, no es necesario enviarlo
      };
      const response = await request(app.getHttpServer()).post('/work-orders').send(data);
      expect(response.status).toBe(401);
    });
  });
});
