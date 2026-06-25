import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// E2E Test Suite for work-orders module
// Tests authentication validation and CRUD operations
describe('Work-order (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Step 1: Create test module and instantiate NestJS app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Step 2: Configure global validation pipe for all requests
    // - whitelist: ignore unknown properties
    // - forbidNonWhitelisted: throw error if extra properties sent
    // - transform: convert types to DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Step 3: Get Prisma service instance and initialize the app
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean up database before each test to ensure isolated state
    await prisma.garage.deleteMany({});
  });

  afterAll(async () => {
    // Close the app after all tests complete (cleanup resources)
    if (app) {
      await app.close();
    }
  });

  // Test suite for POST /work-orders endpoint
  // Validates authentication and successful work order creation
  describe('POST /work-orders', () => {
    it('should return 401 when no token is provided', async () => {
      // Test: POST without Authorization header should reject request
      const data = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        vehicleId: '550e8400-e29c-23c4-a718-446655440000',
        description: 'Test work order',
        openingDate: new Date().toISOString(),
      };
      const response = await request(app.getHttpServer()).post('/work-orders').send(data);
      expect(response.status).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      // Test: POST with malformed/fake token should reject request
      const data = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        vehicleId: '550e8400-e29c-23c4-a718-446655440000',
        description: 'Test work order',
        openingDate: new Date().toISOString(),
      };
      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', 'Bearer invalidtoken')
        .send(data);
      expect(response.status).toBe(401);
    });

    it('should return 401 when token is expired', async () => {
      // Test: POST with expired JWT token should reject request
      const data = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        vehicleId: '550e8400-e29c-23c4-a718-446655440000',
        description: 'Test work order',
        openingDate: new Date().toISOString(),
      };

      // Create a fake JWT token that expires immediately (expiresIn: '-1s')
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
      // Full integration test: Register → Login → Create client → Create vehicle → POST work-order

      // Step 1: Register a new garage tenant with unique fiscalId and email
      // Use Date.now() to ensure uniqueness across multiple test runs
      const createTenant = {
        adminName: 'Ismael Carballo Martín',
        garageName: 'Talleres Carballo',
        fiscalId: Date.now().toString(),
        adminEmail: 'carballomartinismael' + Date.now() + '@gmail.com',
        password: 'password123',
      };
      await request(app.getHttpServer()).post('/auth/register-tenant').send(createTenant);

      // Step 2: Login with the new account to get JWT token and garageId
      const loginOwner = await request(app.getHttpServer()).post('/auth/login-owner').send({
        email: createTenant.adminEmail,
        password: createTenant.password,
      });
      const token = loginOwner.body.access_token;
      const garageId = loginOwner.body.user.garageId;

      // Step 3: Create a client directly in DB via Prisma (not via API)
      const client = await prisma.client.create({
        data: {
          garageId,
          name: 'Juan Pérez',
          email: 'juan' + Date.now() + '@gmail.com',
          phone: '123456789',
        },
      });

      // Step 4: Create a vehicle directly in DB via Prisma with unique license plate
      const vehicleData = await prisma.vehicle.create({
        data: {
          licensePlate: Date.now().toString(),
          brand: 'Toyota',
          model: 'Corolla',
          garageId: garageId,
          clientId: client.id,
        },
      });

      // Step 5: Create work order with valid token and existing client/vehicle
      const createOrder = {
        clientId: client.id,
        vehicleId: vehicleData.id,
        description: 'Test work order',
        openingDate: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrder);

      // Verify: Should return 201 Created status
      expect(response.status).toBe(201);
    });
  });

  describe('GET /work-orders', () => {
    it('should return 200 and list work orders', async () => {
      // Step 1: Register a new garage tenant with unique fiscalId and email
      const createTenant = {
        adminName: 'Ismael Carballo Martín',
        garageName: 'Talleres Carballo',
        fiscalId: Date.now().toString(),
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

      // Step 2: Create a client directly in DB via Prisma
      const client = await prisma.client.create({
        data: {
          garageId,
          name: 'Juan Pérez',
          email: 'juan' + Date.now() + '@gmail.com',
          phone: '123456789',
        },
      });

      // Step 3: Create a vehicle directly in DB via Prisma
      const vehicleData = await prisma.vehicle.create({
        data: {
          licensePlate: Date.now().toString(),
          brand: 'Toyota',
          model: 'Corolla',
          garageId: garageId,
          clientId: client.id,
        },
      });

      // Step 4: Create a work order directly in DB via Prisma
      const createOrder = {
        clientId: client.id,
        vehicleId: vehicleData.id,
        description: 'Test work order',
        openingDate: new Date().toISOString(),
      };

      const responseOrder = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrder);

      expect(responseOrder.status).toBe(201);

      if (typeof responseOrder.body?.id !== 'string') {
        throw new Error('POST /work-orders did not return a valid string id');
      }
      const createdOrderId: string = String(responseOrder.body.id);

      const allOrders = await request(app.getHttpServer())
        .get('/work-orders')
        .set('Authorization', `Bearer ${token}`);

      expect(allOrders.status).toBe(200);
      expect(Array.isArray(allOrders.body)).toBe(true);
      expect(allOrders.body.length).toBeGreaterThan(0);
      expect(allOrders.body.some((order: { id: string }) => order.id === createdOrderId)).toBe(
        true,
      );
    });
  });
});
