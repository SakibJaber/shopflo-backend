import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  details?: any;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T> | ErrorResponse>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T> | ErrorResponse> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        // If data is already a formatted response, return it as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Handle successful responses
        let message = 'Request successful';

        // Only use data.message if it's explicitly provided and NOT part of a DB entity (which usually has _id)
        if (data?.message && !data._id) {
          message = data.message;
        }
        const meta = data?.meta || null;

        return {
          success: true,
          statusCode,
          message,
          data: data?.data || data,
          ...(meta && { meta }),
        };
      }),
      catchError((error) => {
        const response = context.switchToHttp().getResponse();

        // Handle HttpExceptions (thrown by NestJS)
        if (error instanceof HttpException) {
          const statusCode = error.getStatus();
          const errorResponse = error.getResponse();

          response.status(statusCode);

          return throwError(() => ({
            success: false,
            statusCode,
            message:
              typeof errorResponse === 'string'
                ? errorResponse
                : (errorResponse as any).message || error.message,
            error: error.name,
            ...(typeof errorResponse === 'object' && {
              details: errorResponse,
            }),
          }));
        }

        // Handle other types of errors
        const statusCode = error.status || response.statusCode || 500;
        response.status(statusCode);

        return throwError(() => ({
          success: false,
          statusCode,
          message: error.message || 'Internal server error',
          error: error.name || 'Error',
          ...(process.env.NODE_ENV === 'development' && {
            details: error.stack,
          }),
        }));
      }),
    );
  }
}
