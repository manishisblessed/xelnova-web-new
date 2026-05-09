import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || message;
        details = (res as any).details;
      }
      if (status >= 500) {
        this.logger.error(
          `[${request.method}] ${request.url} ${status} — ${typeof message === 'string' ? message : JSON.stringify(message)}`,
        );
      } else if (status >= 400) {
        this.logger.warn(
          `[${request.method}] ${request.url} ${status} — ${typeof message === 'string' ? message : JSON.stringify(message)}`,
        );
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      this.logger.error(
        `[${request.method}] ${request.url} — ${exception.message}`,
        exception.stack,
      );
    }

    if (
      !(exception instanceof HttpException) &&
      !(exception instanceof Error) &&
      status === HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      this.logger.error(
        `[${request.method}] ${request.url} — Unhandled exception`,
        String(exception),
      );
    }

    const outMessage = Array.isArray(message) ? message.join('; ') : message;

    response.status(status).json({
      success: false,
      message: outMessage,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
