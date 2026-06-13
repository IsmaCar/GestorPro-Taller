import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

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
    // Cerrar la aaplicación y los test al terminarlos
    if (app) {
      await app.close();
    }
  });
});
