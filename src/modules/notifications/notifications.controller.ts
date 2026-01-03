import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';

import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryDto,
} from './dto/create-notification.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { NotificationService } from 'src/modules/notifications/notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ==================== GET NOTIFICATIONS (ADMIN) ====================
  @Get()
  async getNotifications(@Query() queryDto: NotificationQueryDto) {
    try {
      const result = await this.notificationService.getNotifications(queryDto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Notifications fetched successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch notifications',
        data: null,
      };
    }
  }

  // ==================== GET MY NOTIFICATIONS ====================
  @Get('my')
  async getMyNotifications(@Req() req) {
    try {
      const userId = req.user.userId;
      const result =
        await this.notificationService.getUserNotifications(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Notifications fetched successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch notifications',
        data: null,
      };
    }
  }

  // ==================== SEED NOTIFICATIONS ====================
  @Post('seed')
  async seedNotifications(@Req() req) {
    try {
      const userId = req.user?.userId;
      const result = await this.notificationService.seedNotifications(userId);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: '5 dummy notifications seeded successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to seed notifications',
        data: null,
      };
    }
  }

  // ==================== GET UNREAD COUNT ====================
  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    try {
      const userId = req.user.userId;
      const count = await this.notificationService.getUnreadCount(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Unread count fetched successfully',
        data: { unreadCount: count },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch unread count',
        data: null,
      };
    }
  }

  // ==================== MARK ALL AS READ ====================
  @Put('read-all')
  async markAllAsRead(@Req() req) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationService.markAllAsRead(userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'All notifications marked as read',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to mark all notifications as read',
        data: null,
      };
    }
  }

  // ==================== GET NOTIFICATION BY ID ====================
  @Get(':id')
  async getNotificationById(@Param('id') id: string) {
    try {
      const notification =
        await this.notificationService.getNotificationById(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Notification fetched successfully',
        data: notification,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch notification',
        data: null,
      };
    }
  }

  // ==================== MARK AS READ ====================
  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    try {
      const notification = await this.notificationService.markAsRead(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Notification marked as read',
        data: notification,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to mark notification as read',
        data: null,
      };
    }
  }

  // ==================== ARCHIVE NOTIFICATION ====================
  @Put(':id/archive')
  async archiveNotification(@Param('id') id: string) {
    try {
      const notification =
        await this.notificationService.archiveNotification(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Notification archived',
        data: notification,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to archive notification',
        data: null,
      };
    }
  }

  // ==================== UPDATE NOTIFICATION ====================
  @Put(':id')
  async updateNotification(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    try {
      const notification = await this.notificationService.updateNotification(
        id,
        updateNotificationDto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Notification updated successfully',
        data: notification,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update notification',
        data: null,
      };
    }
  }

  // ==================== DELETE NOTIFICATION ====================
  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    try {
      await this.notificationService.deleteNotification(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Notification deleted successfully',
        data: null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          data: null,
        };
      }
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to delete notification',
        data: null,
      };
    }
  }
}
