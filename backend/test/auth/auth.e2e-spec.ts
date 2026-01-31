import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

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
});
