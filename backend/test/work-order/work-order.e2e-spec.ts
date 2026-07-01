import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { registerAndLoginOwner } from './helpers/auth.helper';
import {
  buildInvalidWorkOrderPayload,
  buildWorkOrderPayload,
  createClientFixture,
  createVehicleFixture,
} from './helpers/fixtures.helper';
import {
  createWorkOrderRequest,
  getWorkOrderByIdRequest,
  getWorkOrdersRequest,
} from './helpers/requests.helper';

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
      const data = buildInvalidWorkOrderPayload();
      const response = await request(app.getHttpServer()).post('/work-orders').send(data);
      expect(response.status).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      // Invalid token
      const data = buildInvalidWorkOrderPayload();
      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', 'Bearer invalidtoken')
        .send(data);
      expect(response.status).toBe(401);
    });

    it('should return 401 when token is expired', async () => {
      // Expired token
      const data = buildInvalidWorkOrderPayload();

      // Token already expired
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
      const { token, garageId } = await registerAndLoginOwner(app.getHttpServer());
      const client = await createClientFixture(prisma, garageId);
      const vehicle = await createVehicleFixture(prisma, garageId, client.id);
      const createOrder = buildWorkOrderPayload(client.id, vehicle.id);

      const response = await createWorkOrderRequest(app.getHttpServer(), token, createOrder);

      // Created
      expect(response.status).toBe(201);
    });
  });

  // List work orders
  describe('GET /work-orders', () => {
    it('should return 200 and list work orders', async () => {
      const { token, garageId } = await registerAndLoginOwner(app.getHttpServer());
      const client = await createClientFixture(prisma, garageId);
      const vehicle = await createVehicleFixture(prisma, garageId, client.id);
      const createOrder = buildWorkOrderPayload(client.id, vehicle.id);

      const responseOrder = await createWorkOrderRequest(app.getHttpServer(), token, createOrder);

      expect(responseOrder.status).toBe(201);

      // Ensure created id exists
      if (typeof responseOrder.body?.id !== 'string') {
        throw new Error('POST /work-orders did not return a valid string id');
      }
      const createdOrderId: string = String(responseOrder.body.id);

      const allOrders = await getWorkOrdersRequest(app.getHttpServer(), token);

      expect(allOrders.status).toBe(200);
      expect(Array.isArray(allOrders.body)).toBe(true);
      expect(allOrders.body.length).toBeGreaterThan(0);
      expect(allOrders.body.some((order: { id: string }) => order.id === createdOrderId)).toBe(
        true,
      );
    });

    it('should isolate data between tenants in GET /work-orders', async () => {
      // Tenant A creates one order
      const tenantA = await registerAndLoginOwner(app.getHttpServer());
      const clientA = await createClientFixture(prisma, tenantA.garageId);
      const vehicleA = await createVehicleFixture(prisma, tenantA.garageId, clientA.id);
      const orderPayloadA = buildWorkOrderPayload(clientA.id, vehicleA.id);

      const createdA = await createWorkOrderRequest(
        app.getHttpServer(),
        tenantA.token,
        orderPayloadA,
      );
      expect(createdA.status).toBe(201);

      if (typeof createdA.body?.id !== 'string') {
        throw new Error('POST /work-orders did not return a valid string id');
      }
      const orderAId = createdA.body.id as string;

      // Tenant B is isolated
      const tenantB = await registerAndLoginOwner(app.getHttpServer());

      // Query both tenants
      const listB = await getWorkOrdersRequest(app.getHttpServer(), tenantB.token);
      const listA = await getWorkOrdersRequest(app.getHttpServer(), tenantA.token);

      // B cannot see A's order
      expect(listB.status).toBe(200);
      expect(Array.isArray(listB.body)).toBe(true);
      expect(listB.body.some((order: { id: string }) => order.id === orderAId)).toBe(false);

      // A can see its own order
      expect(listA.status).toBe(200);
      expect(Array.isArray(listA.body)).toBe(true);
      expect(listA.body.some((order: { id: string }) => order.id === orderAId)).toBe(true);
    });
  });

  describe('GET /work-orders/:id', () => {
    it('should return 200 and correct data when token and id is valid', async () => {
      const { token, garageId } = await registerAndLoginOwner(app.getHttpServer());
      const client = await createClientFixture(prisma, garageId);
      const vehicle = await createVehicleFixture(prisma, garageId, client.id);

      const createOrder = buildWorkOrderPayload(client.id, vehicle.id);
      const responseOrder = await createWorkOrderRequest(app.getHttpServer(), token, createOrder);

      expect(responseOrder.status).toBe(201);

      const createdOrderId: string = String(responseOrder.body.id);

      const orderById = await getWorkOrderByIdRequest(app.getHttpServer(), token, createdOrderId);

      expect(orderById.status).toBe(200);
      expect(orderById.body).toBeDefined();
      expect(orderById.body.id).toBe(createdOrderId);
      expect(orderById.body.clientId).toBe(client.id);
      expect(orderById.body.vehicleId).toBe(vehicle.id);
    });

    it('should return 404 when no have order', async () => {
      const { token } = await registerAndLoginOwner(app.getHttpServer());

      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const orderById = await getWorkOrderByIdRequest(app.getHttpServer(), token, fakeId);

      expect(orderById.status).toBe(404);
    });
  });
});
