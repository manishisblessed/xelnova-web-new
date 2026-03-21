import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../../modules/logging/logging.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private loggingService: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const userId = (req as any).user?.id;

    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;

      const excludedPaths = ['/health', '/favicon.ico', '/_next', '/static'];
      const shouldLog = !excludedPaths.some(path => originalUrl.startsWith(path));

      if (shouldLog) {
        const clientIp = this.getClientIp(req);
        
        this.loggingService.logApiRequest({
          method,
          endpoint: originalUrl,
          statusCode,
          responseTime,
          userId,
          ipAddress: clientIp,
          userAgent,
          requestBody: this.sanitizeBody(req.body),
          responseBody: statusCode >= 400 ? this.parseResponseBody(responseBody) : undefined,
          error: statusCode >= 400 ? this.parseResponseBody(responseBody)?.message : undefined,
        }).catch(err => console.error('Failed to log request:', err));
      }
    });

    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    const sensitiveFields = ['password', 'token', 'refreshToken', 'accessToken', 'secret', 'apiKey'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private parseResponseBody(body: any): any {
    if (!body) return undefined;
    
    try {
      if (typeof body === 'string') {
        return JSON.parse(body);
      }
      return body;
    } catch {
      return { raw: typeof body === 'string' ? body.substring(0, 500) : undefined };
    }
  }
}
