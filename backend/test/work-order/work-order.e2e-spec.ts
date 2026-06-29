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
import { createWorkOrderRequest, getWorkOrdersRequest } from './helpers/requests.helper';

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
      // Test: POST with malformed/fake token should reject request
      const data = buildInvalidWorkOrderPayload();
      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', 'Bearer invalidtoken')
        .send(data);
      expect(response.status).toBe(401);
    });

    it('should return 401 when token is expired', async () => {
      // Test: POST with expired JWT token should reject request
      const data = buildInvalidWorkOrderPayload();

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
      const { token, garageId } = await registerAndLoginOwner(app.getHttpServer());
      const client = await createClientFixture(prisma, garageId);
      const vehicle = await createVehicleFixture(prisma, garageId, client.id);
      const createOrder = buildWorkOrderPayload(client.id, vehicle.id);

      const response = await createWorkOrderRequest(app.getHttpServer(), token, createOrder);

      // Verify: Should return 201 Created status
      expect(response.status).toBe(201);
    });
  });

  describe('GET /work-orders', () => {
    it('should return 200 and list work orders', async () => {
      const { token, garageId } = await registerAndLoginOwner(app.getHttpServer());
      const client = await createClientFixture(prisma, garageId);
      const vehicle = await createVehicleFixture(prisma, garageId, client.id);
      const createOrder = buildWorkOrderPayload(client.id, vehicle.id);

      const responseOrder = await createWorkOrderRequest(app.getHttpServer(), token, createOrder);

      expect(responseOrder.status).toBe(201);

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
  });

  describe('GET /work-orders/:id', () => {});
});
