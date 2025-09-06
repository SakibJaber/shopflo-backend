import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFAQDto } from './dto/create-faq.dto';
import { FAQ } from 'src/modules/faq/schema/faq.schema';
import { UpdateFAQDto } from 'src/modules/faq/dto/update-faq.dto';

@Injectable()
export class FAQService {
  constructor(@InjectModel(FAQ.name) private readonly faqModel: Model<FAQ>) {}

  // Create a new FAQ
  async create(createFAQDto: CreateFAQDto): Promise<FAQ> {
    const faq = new this.faqModel(createFAQDto);
    return faq.save();
  }

  // Get all FAQs
  async findAll(): Promise<FAQ[]> {
    return this.faqModel.find({ isActive: true }).exec();
  }

  // Get a specific FAQ by ID
  async findOne(id: string): Promise<FAQ> {
    const faq = await this.faqModel.findById(id).exec();
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    return faq;
  }

  // Update a FAQ
  async update(id: string, updateFAQDto: UpdateFAQDto): Promise<FAQ> {
    const faq = await this.faqModel
      .findByIdAndUpdate(id, updateFAQDto, { new: true })
      .exec();
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    return faq;
  }

  // Delete a FAQ
  async remove(id: string): Promise<void> {
    const deletedFaq = await this.faqModel.findByIdAndDelete(id).exec();
    if (!deletedFaq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
  }
}
