import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';

// Suite de tests E2E para el módulo de autenticación
describe('Auth (e2e)', () => {
  let app: INestApplication; // Aplicación de NestJS para hacer peticiones HTTP
  let prisma: PrismaService; // Servicio de Prisma para limpiar la BD entre tests

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
    if (app) {
      await app.close();
    }
  });

  // Tests del endpoint de registro de nuevos talleres
  describe('POST /auth/register-tenant', () => {
    it('should register a new tenant successfully', async () => {
      // Datos válidos para crear un taller nuevo
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'test@test.com',
        password: 'password123',
      };
      // Hacer petición HTTP POST al endpoint de registro
      const response = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(registerData);

      // Tipar la respuesta para tener autocompletado
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
      // Primer registro exitoso
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
        .expect(409); // Espera error 409 (Conflict)

      // Verificar que el mensaje de error menciona el NIF duplicado
      const errorBody = response.body as { message: string };
      expect(errorBody.message).toContain('Ya existe un registro con estos datos');
    });

    it('should allow same email in different garages (multi-tenant)', async () => {
      // Primer garage con su owner
      const registerData1 = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'test@test.com',
        password: 'password123',
      };
      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData1);

      // Segundo garage con MISMO email (debe permitirse - multi-tenant)
      const registerData2 = {
        garageName: 'Taller duplicado',
        adminName: 'Pedro López Martínez',
        fiscalId: 'B87654321',
        adminEmail: 'test@test.com', // Mismo email pero otro garage
        password: 'password456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(registerData2)
        .expect(201); // Debe permitirlo

      expect(response.body.user.email).toBe('test@test.com');
    });

    it('should return 400 if adminName is Invalid', async () => {
      // Nombre con solo 1 palabra (requiere mínimo 3 palabras)
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
        .expect(400); // Espera error 400 (Bad Request)

      const errorBody = response.body as { message: string };
      // Verificar que menciona error en el nombre
      expect(errorBody.message).toEqual(
        expect.arrayContaining(['el nombre del dueño debe contener el nombre y sus dos apellidos']),
      );
    });

    it('should return 400 if fields are missing', async () => {
      // Datos sin el campo 'adminEmail' requerido
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
      // Verificar que menciona que falta el email
      expect(errorBody.message).toEqual(expect.arrayContaining(['adminEmail must be an email']));
    });
  });

  // Tests del endpoint de login para propietarios de taller
  describe('POST /auth/login-owner', () => {
    it('should login successfuly and return access token', async () => {
      // Primero registrar un usuario para poder hacer login
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
        .expect(200); // Espera código 200 (OK)

      // Tipar respuesta del login (token JWT + datos del usuario)
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
      // Registrar usuario
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      // Intentar login con contraseña incorrecta
      const loginData = {
        email: 'owner@test.com',
        password: 'password321', // Contraseña incorrecta
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send(loginData)
        .expect(401);

      const errorBody = response.body as { message: string };
      expect(errorBody.message).toContain('Credenciales inválidas');
    });

    it('should return 401 if email doesn`t exist', async () => {
      // Registrar usuario
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      // Intentar login con email que no existe
      const loginData = {
        email: 'incorrect@test.com', // Email no registrado
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

  // Tests del endpoint de cambio de contraseña (requiere autenticación)
  describe('PATCH /auth/password/change', () => {
    it('should change password succesfully', async () => {
      // 1. Registrar usuario
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      // 2. Hacer login para obtener el token JWT
      const loginResponse = await request(app.getHttpServer()).post('/auth/login-owner').send({
        email: 'owner@test.com',
        password: 'password123',
      });

      const loginBody = loginResponse.body as { access_token: string };
      const token = loginBody.access_token; // Extraer token JWT

      // 3. Cambiar contraseña usando el token de autenticación
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: 'newPassword456',
      };

      const response = await request(app.getHttpServer())
        .patch('/auth/password/change')
        .set('Authorization', `Bearer ${token}`) // Enviar token JWT en header
        .send(changePasswordData)
        .expect(200);

      expect(response.body.message).toContain('éxito');

      // 4. Verificar que puede hacer login con la nueva contraseña
      await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send({ email: 'owner@test.com', password: 'newPassword456' })
        .expect(200);
    });

    it('should return 401 if current password is incorrect', async () => {
      // 1. Registrar usuario y hacer login para obtener token
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };
      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send({ email: 'owner@test.com', password: 'password123' });

      const token = loginResponse.body.access_token;

      // 2. Intentar cambiar contraseña con currentPassword incorrecta
      const changePasswordData = {
        currentPassword: 'passwordincorrecta',
        newPassword: 'newPassword456',
      };

      const response = await request(app.getHttpServer())
        .patch('/auth/password/change')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordData)
        .expect(401); // Espera error 401 (Unauthorized)

      // Verificar mensaje de error de contraseña incorrecta
      expect(response.body.message).toContain('incorrecta');
    });

    it('should return 401 if no token provided', async () => {
      // Test simple: no se necesita registrar ni hacer login
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: 'newPassword456',
      };

      await request(app.getHttpServer())
        .patch('/auth/password/change')
        // SIN .set('Authorization', ...) - no se envía el header de autenticación
        .send(changePasswordData)
        .expect(401); // Debe rechazar petición sin token
    });

    it('should return 401 if token is invalid', async () => {
      // Test simple: no se necesita registrar ni hacer login
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: 'newPassword456',
      };

      await request(app.getHttpServer())
        .patch('/auth/password/change')
        .set('Authorization', 'Bearer tokeninvalidofalso123') // Token falso/inválido
        .send(changePasswordData)
        .expect(401); // Debe rechazar petición con token inválido
    });
  });
  describe('POST /auth/admin/users', () => {
    it('should create user successfuly and generate invitation token', async () => {
      // 1. Registrar usuario y hacer login para obtener token
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };
      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send({ email: 'owner@test.com', password: 'password123' });

      const token = loginResponse.body.access_token;

      const newUserData = {
        name: 'Carlos Méndez López',
        email: 'mechanic@test.com',
        rol: 'MECHANIC',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send(newUserData)
        .expect(201);

      const responseBody = response.body as {
        id: string;
        name: string;
        email: string;
        rol: string;
        invitationToken: string;
        expiresAt: string;
      };

      expect(responseBody.invitationToken).toBeDefined();
      expect(typeof responseBody.invitationToken).toBe('string');
    });

    it('should return 409 if email already exists', async () => {
      // 1. Registrar OWNER y hacer login
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send({ email: 'owner@test.com', password: 'password123' });

      const token = loginResponse.body.access_token;

      // 2. Crear primer usuario exitosamente
      const newUserData = {
        name: 'Carlos Méndez López',
        email: 'mechanic@test.com',
        rol: 'MECHANIC',
      };

      await request(app.getHttpServer())
        .post('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send(newUserData);

      // 3. Intentar crear segundo usuario con mismo email
      const duplicateUserData = {
        name: 'Otro Usuario López',
        email: 'mechanic@test.com', // Email duplicado
        rol: 'MECHANIC',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send(duplicateUserData)
        .expect(409);

      expect(response.body.message).toContain('email');
    });

    it('should return 401 if no token provided', async () => {
      // No se necesita registrar ni hacer login
      const newUserData = {
        name: 'Carlos Méndez López',
        email: 'mechanic@test.com',
        rol: 'MECHANIC',
      };

      await request(app.getHttpServer())
        .post('/auth/admin/users')
        // SIN .set('Authorization', ...) - no se envía el header de autenticación
        .send(newUserData)
        .expect(401); // Debe rechazar petición sin token
    });

    it('should return 401 if token is invalid', async () => {
      // No se necesita registrar ni hacer login
      const newUserData = {
        name: 'Carlos Méndez López',
        email: 'mechanic@test.com',
        rol: 'MECHANIC',
      };

      await request(app.getHttpServer())
        .post('/auth/admin/users')
        .set('Authorization', 'Bearer tokenfalso123') // Token inválido
        .send(newUserData)
        .expect(401); // Debe rechazar petición con token inválido
    });

    it('should return 403 if trying to create OWNER user', async () => {
      // 1. Registrar OWNER y hacer login
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send({ email: 'owner@test.com', password: 'password123' });

      const token = loginResponse.body.access_token;

      // 2. Intentar crear usuario con rol OWNER (no permitido)
      const ownerUserData = {
        name: 'Otro Owner López',
        email: 'otro.owner@test.com',
        rol: 'OWNER', // Rol no permitido
      };

      const response = await request(app.getHttpServer())
        .post('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send(ownerUserData)
        .expect(403); // Espera error 403 (Forbidden)

      // Verificar que el mensaje indica que no puede crear usuarios OWNER
      expect(response.body.message).toBeDefined();
    });
  });

  // Tests del endpoint de activación de cuenta de usuarios invitados
  describe('POST /auth/activate-account', () => {
    it('should activate account successfully and allow login', async () => {
      // 1. Registrar OWNER y hacer login
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send({ email: 'owner@test.com', password: 'password123' });

      const token = loginResponse.body.access_token;

      // 2. Crear usuario invitado para obtener invitationToken
      const newUserData = {
        name: 'Carlos Méndez López',
        email: 'mechanic@test.com',
        rol: 'MECHANIC',
      };

      const createUserResponse = await request(app.getHttpServer())
        .post('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send(newUserData)
        .expect(201);

      const invitationToken = createUserResponse.body.invitationToken;

      // 3. Activar cuenta usando el invitationToken
      const activateData = {
        invitationToken: invitationToken,
        password: 'newPassword123',
      };

      const activateResponse = await request(app.getHttpServer())
        .post('/auth/activate-account')
        .send(activateData)
        .expect(200);

      expect(activateResponse.body.access_token).toBeDefined();
      expect(typeof activateResponse.body.access_token).toBe('string');

      // 4. Verificar que puede usar el token para hacer peticiones autenticadas
      await request(app.getHttpServer())
        .patch('/auth/password/change')
        .set('Authorization', `Bearer ${activateResponse.body.access_token}`)
        .send({ currentPassword: 'newPassword123', newPassword: 'anotherPassword456' })
        .expect(200);
    });

    it('should return 400 if token is invalid', async () => {
      // Test simple: enviar token que no existe en BD
      const activateData = {
        invitationToken: 'tokenfalsoinexistente123',
        password: 'newPassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/activate-account')
        .send(activateData)
        .expect(400); // Espera error 400 (Bad Request)

      // Verificar mensaje de error
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 if account is already activated', async () => {
      // 1. Registrar OWNER y hacer login
      const registerData = {
        garageName: 'Taller test',
        adminName: 'Juan Pérez García',
        fiscalId: 'B12345678',
        adminEmail: 'owner@test.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register-tenant').send(registerData);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login-owner')
        .send({ email: 'owner@test.com', password: 'password123' });

      const token = loginResponse.body.access_token;

      // 2. Crear usuario invitado
      const newUserData = {
        name: 'Carlos Méndez López',
        email: 'mechanic@test.com',
        rol: 'MECHANIC',
      };

      const createUserResponse = await request(app.getHttpServer())
        .post('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send(newUserData)
        .expect(201);

      const invitationToken = createUserResponse.body.invitationToken;

      // 3. Activar cuenta por primera vez (exitoso)
      const activateData = {
        invitationToken: invitationToken,
        password: 'newPassword123',
      };

      await request(app.getHttpServer())
        .post('/auth/activate-account')
        .send(activateData)
        .expect(200);

      // 4. Intentar activar la misma cuenta nuevamente
      const response = await request(app.getHttpServer())
        .post('/auth/activate-account')
        .send(activateData)
        .expect(400); // Espera error 400 (Bad Request)

      // Verificar mensaje de error sobre cuenta ya activada
      expect(response.body.message).toBeDefined();
    });
  });
});
