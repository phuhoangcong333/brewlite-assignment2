import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId =
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : randomUUID();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Đã xảy ra lỗi máy chủ'
        : typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
          ? exceptionResponse.message
          : typeof exceptionResponse === 'string'
            ? exceptionResponse
            : 'Đã xảy ra lỗi máy chủ';
    const error =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'error' in exceptionResponse &&
      typeof exceptionResponse.error === 'string'
        ? exceptionResponse.error
        : status === HttpStatus.BAD_REQUEST
          ? 'Bad Request'
          : status === HttpStatus.UNAUTHORIZED
            ? 'Unauthorized'
            : status === HttpStatus.FORBIDDEN
              ? 'Forbidden'
              : status === HttpStatus.NOT_FOUND
                ? 'Not Found'
                : status === HttpStatus.CONFLICT
                  ? 'Conflict'
                  : 'Internal Server Error';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.setHeader('x-request-id', requestId);
    response.status(status).json({
      statusCode: status,
      error,
      message,
      requestId,
    });
  }
}
