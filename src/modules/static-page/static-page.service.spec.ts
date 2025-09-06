import { Test, TestingModule } from '@nestjs/testing';
import { StaticPageService } from './static-page.service';

describe('StaticPageService', () => {
  let service: StaticPageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaticPageService],
    }).compile();

    service = module.get<StaticPageService>(StaticPageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
