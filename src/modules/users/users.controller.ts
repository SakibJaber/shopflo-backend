import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from 'src/common/enum/user_role.enum';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserStatus } from 'src/common/enum/user.status.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    try {
      const user = await this.usersService.findById(id);
      if (!user) {
        return {
          success: false,
          statusCode: 404,
          message: 'User not found',
          data: null,
        };
      }
      return {
        success: true,
        statusCode: 200,
        message: 'User fetched successfully',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: error.message || 'Internal server error',
        data: null,
      };
    }
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async approveUser(@Param('id') id: string) {
    try {
      await this.usersService.updateStatus(id, UserStatus.APPROVED);
      const updatedUser = await this.usersService.findById(id);
      return {
        success: true,
        statusCode: 200,
        message: 'User approved successfully',
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Unable to approve user',
        data: null,
      };
    }
  }

  @Patch(':id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async blockUser(@Param('id') id: string) {
    try {
      await this.usersService.updateStatus(id, UserStatus.BLOCKED);
      return {
        success: true,
        statusCode: 200,
        message: 'User blocked successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Unable to block user',
        data: null,
      };
    }
  }

  @Patch(':id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async unblockUser(@Param('id') id: string) {
    try {
      await this.usersService.updateStatus(id, UserStatus.APPROVED);
      return {
        success: true,
        statusCode: 200,
        message: 'User unblocked successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Unable to unblock user',
        data: null,
      };
    }
  }
}
