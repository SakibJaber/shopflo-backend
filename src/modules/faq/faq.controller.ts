import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FAQService } from './faq.service';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';

@Controller('faq')
export class FAQController {
  constructor(private readonly faqService: FAQService) {}

  // Create a new FAQ
  @Post()
  async create(@Body() createFAQDto: CreateFAQDto) {
    return this.faqService.create(createFAQDto);
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
  async update(
    @Param('id') id: string,
    @Body() updateFAQDto: UpdateFAQDto,
  ) {
    return this.faqService.update(id, updateFAQDto);
  }

  // Delete FAQ by ID
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}
