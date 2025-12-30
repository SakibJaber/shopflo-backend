import { ResponseInterceptor } from './response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should use default message if data has _id (entity)', (done) => {
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 201 }),
      }),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of({ _id: '123', message: 'User content' }),
    };

    interceptor.intercept(context, next).subscribe((result: any) => {
      expect(result.message).toBe('Request successful');
      expect(result.data.message).toBe('User content');
      done();
    });
  });

  it('should use data.message if data does NOT have _id', (done) => {
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () =>
        of({ message: 'Custom success message', data: { foo: 'bar' } }),
    };

    interceptor.intercept(context, next).subscribe((result: any) => {
      expect(result.message).toBe('Custom success message');
      expect(result.data).toEqual({ foo: 'bar' });
      done();
    });
  });
});
