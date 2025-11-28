import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StaticPage } from 'src/modules/static-page/schema/static-page.schema';

@Injectable()
export class StaticPageService {
  constructor(
    @InjectModel(StaticPage.name)
    private readonly staticPageModel: Model<StaticPage>,
  ) {}

  // Find static page by type
  async findPageByType(type: string): Promise<StaticPage> {
    const page = await this.staticPageModel.findOne({ type }).exec();
    if (!page) {
      throw new NotFoundException(`${type} page not found`);
    }
    return page;
  }

  // Update static page by type (creates with empty data if not found)
  async updatePageByType(
    type: string,
    updateData: Partial<StaticPage>,
  ): Promise<StaticPage> {
    let page = await this.staticPageModel.findOne({ type }).exec();

    if (!page) {
      // Create new page with provided data or empty defaults
      page = new this.staticPageModel({
        type,
        title: updateData.title || '',
        content: updateData.content || '',
      });
    } else {
      // Update existing page
      if (updateData.title !== undefined) {
        page.title = updateData.title;
      }
      if (updateData.content !== undefined) {
        page.content = updateData.content;
      }
    }

    return await page.save();
  }
}
