import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from 'src/common/enum/user_role.enum';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserStatus } from 'src/common/enum/user.status.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { User } from 'src/modules/users/schema/user.schema';
import { OptionalParseArrayPipe } from 'src/common/pipes/parsearray.pipe';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';

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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUsers(
    @Query('role', new OptionalParseArrayPipe()) roles?: string[],
    @Query('status', new OptionalParseArrayPipe()) statuses?: UserStatus[],
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    try {
      const users = await this.usersService.findAll({
        roles,
        statuses,
        page,
        limit,
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Users fetched successfully',
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: error.message || 'Failed to fetch users',
        data: null,
      };
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: any,
  ) {
    try {
      const updatedUser = await this.usersService.updateUser(
        id,
        updateData,
        file,
        req.user,
      );
      return {
        success: true,
        statusCode: 200,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Failed to update user',
        data: null,
      };
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteUser(@Param('id') id: string) {
    try {
      await this.usersService.deleteUser(id);
      return {
        success: true,
        statusCode: 200,
        message: 'User deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Failed to delete user',
        data: null,
      };
    }
  }

  // Get users by role
  @Get('role/:role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUsersByRole(@Param('role') role: Role) {
    try {
      const users = await this.usersService.findAllByRole(role);
      return {
        success: true,
        statusCode: 200,
        message: `Users with role ${role} fetched successfully`,
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: error.message || 'Failed to fetch users by role',
        data: null,
      };
    }
  }

  // Get users by status
  @Get('status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUsersByStatus(@Param('status') status: UserStatus) {
    try {
      const users = await this.usersService.findByStatus(status);
      return {
        success: true,
        statusCode: 200,
        message: `Users with status ${status} fetched successfully`,
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: error.message || 'Failed to fetch users by status',
        data: null,
      };
    }
  }
}
