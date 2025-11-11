import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getTopStats() {
    return await this.dashboardService.getTopStats();
  }

  @Get('user-growth')
  async getUserGrowth(@Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number) {
    return await this.dashboardService.getUserGrowth(year);
  }

  @Get('order-growth')
  async getOrderGrowth(@Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number) {
    return await this.dashboardService.getOrderGrowth(year);
  }

  @Get('earnings-growth')
  async getEarningsGrowth(@Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number) {
    return await this.dashboardService.getEarningsGrowth(year);
  }
}
