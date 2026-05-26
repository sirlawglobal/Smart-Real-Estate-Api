import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    // body intentionally excluded — never log request bodies (passwords, tokens = PII)
    const { method, url, user } = req;
    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} | User: ${user?.id || 'anonymous'}`,
    );

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        this.logger.log(
          `Outgoing Response: ${method} ${url} | Status: ${res.statusCode} | ${Date.now() - now}ms`,
        );
      }),
    );
  }
}
