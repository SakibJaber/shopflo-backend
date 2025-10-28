// src/modules/notifications/dto/create-notification.dto.ts
import {
    IsString,
    IsEnum,
    IsOptional,
    IsObject,
    IsMongoId,
    IsBoolean,
    IsDate,
    IsNumber,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { Types } from 'mongoose';
  import { NotificationPriority, NotificationStatus } from '../schema/notification.schema';
import { NotificationType } from 'src/common/enum/notification_type.enum';
  
  export class CreateNotificationDto {
    @IsOptional()
    @IsMongoId()
    recipient?: string | Types.ObjectId;
  
    @IsOptional()
    @IsMongoId()
    sender?: string | Types.ObjectId;
  
    @IsString()
    title: string;
  
    @IsString()
    message: string;
  
    @IsEnum(NotificationType)
    @IsOptional()
    type?: NotificationType;
  
    @IsEnum(NotificationPriority)
    @IsOptional()
    priority?: NotificationPriority;
  
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
  
    @IsOptional()
    @IsMongoId()
    relatedId?: string | Types.ObjectId;
  
    @IsOptional()
    @IsString()
    relatedModel?: string;
  
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    expiresAt?: Date;
  }
  
  export class UpdateNotificationDto {
    @IsEnum(NotificationStatus)
    @IsOptional()
    status?: NotificationStatus;
  
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
  }
  
  export class NotificationQueryDto {
    @IsOptional()
    @IsMongoId()
    recipient?: string;
  
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;
  
    @IsOptional()
    @IsEnum(NotificationStatus)
    status?: NotificationStatus;
  
    @IsOptional()
    @IsEnum(NotificationPriority)
    priority?: NotificationPriority;
  
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
  
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate?: Date;
  
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;
  
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page?: number;
  
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number;
  }