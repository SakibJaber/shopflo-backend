import { Test, TestingModule } from '@nestjs/testing';
import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';

describe('SizesController', () => {
  let controller: SizesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SizesController],
      providers: [SizesService],
    }).compile();

    controller = module.get<SizesController>(SizesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
