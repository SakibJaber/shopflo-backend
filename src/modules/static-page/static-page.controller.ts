import { Controller, Body, Get, Put, UseGuards } from '@nestjs/common';
import { StaticPageService } from './static-page.service';
import { UpdateStaticPageDto } from './dto/update-static-page.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('pages')
export class StaticPageController {
  constructor(private readonly staticPageService: StaticPageService) {}

  // Get static pages
  @Get('about')
  async getAboutUs() {
    return this.staticPageService.findPageByType('about');
  }

  @Get('terms')
  async getTerms() {
    return this.staticPageService.findPageByType('terms');
  }

  @Get('privacy')
  async getPrivacyPolicy() {
    return this.staticPageService.findPageByType('privacy');
  }

  // Update pages individually
  @Put('about')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateAbout(@Body() updateStaticPageDto: UpdateStaticPageDto) {
    return this.staticPageService.updatePageByType(
      'about',
      updateStaticPageDto,
    );
  }

  @Put('terms')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateTerms(@Body() updateStaticPageDto: UpdateStaticPageDto) {
    return this.staticPageService.updatePageByType(
      'terms',
      updateStaticPageDto,
    );
  }

  @Put('privacy')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updatePrivacy(@Body() updateStaticPageDto: UpdateStaticPageDto) {
    return this.staticPageService.updatePageByType(
      'privacy',
      updateStaticPageDto,
    );
  }
}
