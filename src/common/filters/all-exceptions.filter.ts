import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
      error = exception.name;
      if (typeof exceptionResponse === 'object') {
        details = exceptionResponse;
      }
    } else if ((exception as any).code === 11000) {
      // Handle MongoDB duplicate key error
      status = HttpStatus.CONFLICT;
      const field = Object.keys((exception as any).keyPattern)[0];
      message = `Duplicate value for field: ${field}`;
      error = 'Conflict';
    } else if ((exception as any).name === 'ValidationError') {
      // Handle Mongoose validation error
      status = HttpStatus.BAD_REQUEST;
      message = `Validation failed: ${(exception as any).message}`;
      error = 'Bad Request';
    } else if (exception instanceof Error) {
      // Handle generic errors
      message = exception.message;
      error = exception.name;
    }

    const responseBody = {
      success: false,
      statusCode: status,
      message,
      error,
      data: null,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : null,
        details,
      }),
    };

    response.status(status).json(responseBody);
  }
}
