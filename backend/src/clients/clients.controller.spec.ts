import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let mockClientsService: any;

  beforeEach(async () => {
    // Mock del service
    mockClientsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    //Módulo de testing aislado
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();
    //Obtiene la instancia del controlador desde el módulo testing
    controller = module.get<ClientsController>(ClientsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.create whit correct params', () => {
    const dto = { name: 'Juan', email: 'a@a.com', phone: '987654321' };

    controller.create(dto);

    expect(mockClientsService.create).toHaveBeenCalledWith('hardcoded-garage-id', dto);
  });

  it('should call service.findAll', () => {
    controller.findAll();
    expect(mockClientsService.findAll).toHaveBeenCalledWith('hardcoded-garage-id');
  });

  it('should call service.findOne', () => {
    const id = 'client-uuid-123';

    controller.findOne(id);

    expect(mockClientsService.findOne).toHaveBeenCalledWith('hardcoded-garage-id', id);
  });

  it('should call service.update', () => {
    const id = 'client-uuid-123';
    const dto = { email: 'new@test.com', phone: '987654321' };

    controller.update(id, dto);

    expect(mockClientsService.update).toHaveBeenCalledWith('hardcoded-garage-id', id, dto);
  });
});
