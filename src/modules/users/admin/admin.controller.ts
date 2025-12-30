import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Controller('admin')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  async create(@Body() dto: CreateAdminDto) {
    const result = await this.adminService.create(dto);
    return {
      message: 'Admin created successfully',
      data: result,
    };
  }

  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.adminService.delete(id);
    return {
      message: 'Admin deleted successfully',
      data: result,
    };
  }
}
