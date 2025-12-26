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
      findMany: jest.fn(),
      findOne: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

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
});
