import { Test, TestingModule } from '@nestjs/testing';
import { StaticPageController } from './static-page.controller';
import { StaticPageService } from './static-page.service';

describe('StaticPageController', () => {
  let controller: StaticPageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaticPageController],
      providers: [StaticPageService],
    }).compile();

    controller = module.get<StaticPageController>(StaticPageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
