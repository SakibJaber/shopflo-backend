import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      response.status(HttpStatus.CONFLICT).json({
        success: false,
        statusCode: HttpStatus.CONFLICT,
        message: `Duplicate value for field: ${field}`,
        error: 'Conflict',
        data: null,
      });
      return;
    }

    // Handle MongoDB validation error
    if (error.name === 'ValidationError') {
      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Validation failed: ${error.message}`,
        error: 'Bad Request',
        data: null,
      });
      return;
    }

    // Handle existing HttpExceptions (e.g., NotFoundException, BadRequestException)
    if (error instanceof HttpException) {
      const status = error.getStatus();
      response.status(status).json({
        success: false,
        statusCode: status,
        message: error.message,
        error: error.name,
        data: null,
      });
      return;
    }

    // Handle uncaught errors as generic server errors
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
      data: null,
    });
  }
}
