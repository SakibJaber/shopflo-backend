import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { StaticPage } from 'src/modules/static-page/schema/static-page.schema';

@Injectable()
export class StaticPageService {
  constructor(
    @InjectModel(StaticPage.name)
    private readonly staticPageModel: Model<StaticPage>,
  ) {}

  // Create a static page (About Us, Terms, Privacy Policy)
  async create(createStaticPageDto: CreateStaticPageDto): Promise<StaticPage> {
    // Check if a page with this type already exists
    const existingPage = await this.staticPageModel.findOne({
      type: createStaticPageDto.type,
    });
    if (existingPage) {
      throw new ConflictException(
        `${createStaticPageDto.type} page already exists.`,
      );
    }

    const page = new this.staticPageModel(createStaticPageDto);
    return await page.save();
  }

  // Find static page by type
  async findPageByType(type: string): Promise<StaticPage> {
    const page = await this.staticPageModel.findOne({ type }).exec();
    if (!page) {
      throw new NotFoundException(`${type} page not found`);
    }
    return page;
  }
}
