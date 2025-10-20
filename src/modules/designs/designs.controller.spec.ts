import { Test, TestingModule } from '@nestjs/testing';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';

describe('DesignsController', () => {
  let controller: DesignsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DesignsController],
      providers: [DesignsService],
    }).compile();

    controller = module.get<DesignsController>(DesignsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
