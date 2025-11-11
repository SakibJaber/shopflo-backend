import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { StaticPageService } from './static-page.service';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('pages')
export class StaticPageController {
  constructor(private readonly staticPageService: StaticPageService) {}

  // Create static page (e.g., About Us, Terms, Privacy Policy)

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() createStaticPageDto: CreateStaticPageDto) {
    return this.staticPageService.create(createStaticPageDto);
  }

  // Fetch pages (About Us, Terms, Privacy Policy)
  @Get('about-us')
  async getAboutUs() {
    return this.staticPageService.findPageByType('about-us');
  }

  @Get('terms-and-conditions')
  async getTermsAndConditions() {
    return this.staticPageService.findPageByType('terms');
  }

  @Get('terms')
  async getTerms() {
    return this.staticPageService.findPageByType('terms');
  }

  @Get('privacy-policy')
  async getPrivacyPolicy() {
    return this.staticPageService.findPageByType('privacy-policy');
  }
}
