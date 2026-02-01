import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { registerSchema } from 'class-validator';
import { response } from 'express';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    //1. Crear el módulo test y la aplicación para iniciarla
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    //2. Crear restricciones para los test
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    //3. Coger los servicios de Prisma e iniciar la aplicación
    prisma = app.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    //Limpiar BD en cada Test
    await prisma.user.deleteMany({});
    await prisma.garage.deleteMany({});
  });

  afterAll(async () => {
    //Cerrar la aplicación y la conexión con la BD después de los test
    await app.close();
  });

  describe('POST /auth/register-tenant', () => {
    it('should register a new tenant successfully', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'test@test.com',
        password: 'password123',
      };
      const response = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(registerData)
        .expect(201);

      const responseBody = response.body as {
        garage: { id: string; name: string; fiscalId: string };
        user: { id: string; name: string; email: string; rol: string };
      };

      // 1. Verificar estructura general
      expect(response.body).toHaveProperty('garage');
      expect(response.body).toHaveProperty('user');

      // 2. Verificar datos del garage
      expect(responseBody.garage).toHaveProperty('id');
      expect(responseBody.garage.name).toBe('Taller test');
      expect(responseBody.garage.fiscalId).toBe('B12345678');

      // 3. Verificar datos del user
      expect(responseBody.user).toHaveProperty('id');
      expect(responseBody.user.name).toBe('Juan Pérez García');
      expect(responseBody.user.email).toBe('test@test.com');
      expect(responseBody.user.rol).toBe('OWNER');

      // 4. Verificar que NO devuelve datos sensibles
      expect(responseBody.user).not.toHaveProperty('passwordHash');
    });

    it('should return 409 if fiscalId already exists', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'test@test.com',
        password: 'password123',
      };
      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const duplicateData = {
        garageName: 'Taller duplicado',
        adminName: 'Pedro López Martínez',
        fiscalId: 'B12345678',
        adminEmail: 'otro@test.com',
        password: 'password456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(duplicateData)
        .expect(409);

      const errorBody = response.body as { message: string };
      expect(errorBody.message).toContain('NIF');
    });

    it('should return 409 if email already exists', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'test@test.com',
        password: 'password123',
      };
      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const duplicateData = {
        garageName: 'Taller duplicado',
        adminName: 'Pedro López Martínez',
        fiscalId: 'B87654321',
        adminEmail: 'test@test.com',
        password: 'password456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(duplicateData)
        .expect(409);

      const errorBody = response.body as { message: string };

      expect(errorBody.message).toContain('email');
    });

    it('should return 400 if adminName is Invalid', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan',
        fiscalId: 'B12345678',
        adminEmail: 'test@test.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(registerData)
        .expect(400);

      const errorBody = response.body as { message: string };

      expect(errorBody.message).toContain('name');
    });

    it('should return 400 if fields are missing', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(registerData)
        .expect(400);

      const errorBody = response.body as { message: string };

      expect(errorBody.message).toContain('email');
    });
  });

  describe('POST /auth/login-owner', () => {
    it('should login successfuly and return access token', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginData = {
        email: 'owner@test.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send(loginData)
        .expect(200);

      const responseBody = response.body as {
        access_token: string;
        user: { id: string; name: string; email: string; rol: string; garageId: string };
      };

      //Verificaciones sobre access_token
      expect(responseBody).toHaveProperty('access_token');
      expect(typeof responseBody.access_token).toBe('string');
      expect(responseBody.access_token.length).toBeGreaterThan(0);

      //Verificaciones sobre user
      expect(responseBody).toHaveProperty('user');
      expect(responseBody.user.id).toBeDefined();
      expect(responseBody.user.name).toBe('Juan Pérez García');
      expect(responseBody.user.email).toBe('owner@test.com');
      expect(responseBody.user.rol).toBe('OWNER');
      expect(responseBody.user.garageId).toBeDefined();

      //Verificar que no devuelve datos sensibles
      expect(responseBody.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 if password is incorrect', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginData = {
        email: 'owner@test.com',
        password: 'password321',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send(loginData)
        .expect(401);

      const errorBody = response.body as { message: string };
      expect(errorBody.message).toContain('Credenciales inválidas');
    });

    it('should return 401 if email doesn`t exist', async () => {
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginData = {
        email: 'incorrect@test.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send(loginData)
        .expect(401);

      const errorBody = response.body as { message: string };
      expect(errorBody.message).toContain('Credenciales inválidas');
    });
  });
});
