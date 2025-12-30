import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FAQService } from './faq.service';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';

@Controller('faq')
export class FAQController {
  constructor(private readonly faqService: FAQService) {}

  // Create a new FAQ
  @Post()
  async create(@Body() createFAQDto: CreateFAQDto) {
    const result = await this.faqService.create(createFAQDto);
    return {
      message: 'FAQ created successfully',
      data: result,
    };
  }

  // Get all FAQs
  @Get()
  async findAll() {
    return this.faqService.findAll();
  }

  // Get FAQ by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  // Update FAQ by ID
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateFAQDto: UpdateFAQDto) {
    const result = await this.faqService.update(id, updateFAQDto);
    return {
      message: 'FAQ updated successfully',
      data: result,
    };
  }

  // Delete FAQ by ID
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.faqService.remove(id);
    return {
      message: 'FAQ deleted successfully',
      data: result,
    };
  }
}
