import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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

    it('should return 401 when token is invalid', async () => {
      const data = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        vehicleId: '550e8400-e29c-23c4-a718-446655440000',
        description: 'Test work order',
        // assignedMechanic omitido (opcional)
        openingDate: new Date().toISOString(),
        // el state se asigna automáticamente en el backend, no es necesario enviarlo
      };
      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', 'Bearer invalidtoken')
        .send(data);
      expect(response.status).toBe(401);
    });

    it('should return 401 when token is expired', async () => {
      const data = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        vehicleId: '550e8400-e29c-23c4-a718-446655440000',
        description: 'Test work order',
        // assignedMechanic omitido (opcional)
        openingDate: new Date().toISOString(),
        // el state se asigna automáticamente en el backend, no es necesario enviarlo
      };
      const tokenExpired = jwt.sign({ sub: 'user-id', email: 'user@example.com' }, 'secret', {
        expiresIn: '-1s',
      });
      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${tokenExpired}`)
        .send(data);

      expect(response.status).toBe(401);
    });

    it('should return 201 when valid token is provided', async () => {
      const createTenant = {
        adminName: 'Ismael Carballo Martín',
        garageName: 'Talleres Carballo',
        fiscalId: Date.now().toString(), // Generar un NIF único para cada test
        adminEmail: 'carballomartinismael' + Date.now() + '@gmail.com',
        password: 'password123',
      };
      await request(app.getHttpServer()).post('/auth/register-tenant').send(createTenant);

      const loginOwner = await request(app.getHttpServer()).post('/auth/login-owner').send({
        email: createTenant.adminEmail,
        password: createTenant.password,
      });

      const token = loginOwner.body.access_token;
      const garageId = loginOwner.body.user.garageId;

      const client = await prisma.client.create({
        data: {
          garageId,
          name: 'Juan Pérez',
          email: 'juan' + Date.now() + '@gmail.com',
          phone: '123456789',
        },
      });

      const vehicleData = await prisma.vehicle.create({
        data: {
          licensePlate: Date.now().toString(), // Generar una matrícula única para cada test
          brand: 'Toyota',
          model: 'Corolla',
          garageId: garageId,
          clientId: client.id,
        },
      });
      const createOrder = {
        clientId: client.id,
        vehicleId: vehicleData.id,
        description: 'Test work order',
        // assignedMechanic omitido (opcional)
        openingDate: new Date().toISOString(),
        // el state se asigna automáticamente en el backend, no es necesario enviarlo
      };

      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrder);

      expect(response.status).toBe(201);
    });
  });
});
